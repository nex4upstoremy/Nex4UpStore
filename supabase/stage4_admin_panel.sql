-- =====================================================================
-- NEX4UP Stage 4: Admin Panel (Real-Time Inbox, Live Orders/Approvals,
-- Instant Dashboard Cache + Strict Opaque Admin Session Auth)
-- =====================================================================

-- 1. Private Admin Config (holds secret 64-char Realtime channel key)
create table if not exists public.nex4up_admin_config (
  config_key text primary key,
  config_val text not null,
  updated_at timestamptz not null default now()
);

alter table public.nex4up_admin_config enable row level security;
revoke all on public.nex4up_admin_config from anon, authenticated;

insert into public.nex4up_admin_config (config_key, config_val)
values (
  'realtime_channel_key',
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
)
on conflict (config_key) do nothing;

-- 2. Private Opaque Admin Sessions (issued ONLY by GAS after verifying Admin!B2)
create table if not exists public.nex4up_admin_sessions (
  admin_token text primary key default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  revoked boolean not null default false
);

alter table public.nex4up_admin_sessions enable row level security;
revoke all on public.nex4up_admin_sessions from anon, authenticated;

-- 3. Private Full Admin Orders Mirror (includes Cost/Profit/Receipt/Phone — strict RLS)
create table if not exists public.nex4up_admin_orders (
  order_id text primary key,
  customer_email text not null default '',
  payment_status text not null default '',
  fulfilment_status text not null default '',
  payment_method text not null default '',
  total_rm numeric(10,2) not null default 0,
  has_receipt boolean not null default false,
  order_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nex4up_admin_orders_created
  on public.nex4up_admin_orders (created_at desc, order_id desc);

alter table public.nex4up_admin_orders enable row level security;
revoke all on public.nex4up_admin_orders from anon, authenticated;

-- 4. Private Admin Dashboard & Ops Cache (strict RLS — NO direct anon/authenticated access)
create table if not exists public.nex4up_admin_cache (
  cache_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nex4up_admin_cache enable row level security;
revoke all on public.nex4up_admin_cache from anon, authenticated;

-- 5. Fast index for Admin unread badge count on Stage 1 chat messages
create index if not exists idx_nex4up_chat_messages_unread_admin
  on public.nex4up_chat_messages (customer_email)
  where sender = 'customer' and read_by_admin = false;

-- 6. Internal helper: validate active admin_token
create or replace function public._nex4up_s4_is_valid_admin(
  p_admin_token text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.nex4up_admin_sessions
    where admin_token = trim(coalesce(p_admin_token, ''))
      and revoked = false
      and expires_at > now()
  );
$$;

-- 7. Admin RPC: Revoke session on Admin logout
create or replace function public.nex4up_s4_admin_logout(
  p_admin_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tok text := trim(coalesce(p_admin_token, ''));
begin
  if v_tok <> '' then
    update public.nex4up_admin_sessions
    set revoked = true
    where admin_token = v_tok;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- 8. Admin RPC: Fast Conversations List (~100-150 ms)
create or replace function public.nex4up_s4_admin_get_conversations(
  p_admin_token text,
  p_limit int default 120
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lim int := greatest(1, least(coalesce(p_limit, 120), 300));
  v_rows jsonb := '[]'::jsonb;
  v_total_unread int := 0;
begin
  if not public._nex4up_s4_is_valid_admin(p_admin_token) then
    return jsonb_build_object('ok', false, 'error', 'invalid_admin_token');
  end if;

  select count(*)::int into v_total_unread
  from public.nex4up_chat_messages
  where sender = 'customer' and read_by_admin = false;

  with latest as (
    select distinct on (customer_email)
      customer_email,
      message,
      sender,
      image_url,
      created_at
    from public.nex4up_chat_messages
    order by customer_email, created_at desc, id desc
  ),
  unreads as (
    select customer_email, count(*)::int as cnt
    from public.nex4up_chat_messages
    where sender = 'customer' and read_by_admin = false
    group by customer_email
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'email', sub.email,
        'name', sub.customer_name,
        'chatToken', sub.chat_token,
        'lastMessage', sub.last_message,
        'lastSender', sub.last_sender,
        'lastDate', to_char(sub.last_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI:SS'),
        'unread', sub.unread
      )
      order by sub.last_at desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select
      t.email,
      coalesce(nullif(t.customer_name, ''), t.email) as customer_name,
      t.chat_token,
      coalesce(l.message, '') as last_message,
      coalesce(l.sender, 'customer') as last_sender,
      coalesce(l.created_at, t.last_message_at, t.updated_at) as last_at,
      coalesce(u.cnt, 0) as unread
    from public.nex4up_chat_threads t
    left join latest l on l.customer_email = t.email
    left join unreads u on u.customer_email = t.email
    order by coalesce(l.created_at, t.last_message_at, t.updated_at) desc
    limit v_lim
  ) sub;

  return jsonb_build_object(
    'ok', true,
    'conversations', v_rows,
    'totalUnread', v_total_unread
  );
end;
$$;

-- 9. Admin RPC: Fast Thread Messages (~100 ms)
create or replace function public.nex4up_s4_admin_get_messages(
  p_admin_token text,
  p_email text,
  p_limit int default 150
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_lim int := greatest(1, least(coalesce(p_limit, 150), 300));
  v_chat_token text := '';
  v_msgs jsonb := '[]'::jsonb;
begin
  if not public._nex4up_s4_is_valid_admin(p_admin_token) then
    return jsonb_build_object('ok', false, 'error', 'invalid_admin_token');
  end if;

  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  select coalesce(chat_token, '') into v_chat_token
  from public.nex4up_chat_threads
  where email = v_email;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', sub.id,
        'client_msg_id', sub.client_msg_id,
        'email', sub.customer_email,
        'name', sub.customer_name,
        'sender', sub.sender,
        'message', sub.message,
        'imageUrl', sub.image_url,
        'date', to_char(sub.created_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI:SS'),
        'createdAt', sub.created_at
      )
      order by sub.created_at asc, sub.id asc
    ),
    '[]'::jsonb
  )
  into v_msgs
  from (
    select id, client_msg_id, customer_email, customer_name, sender, message, image_url, created_at
    from public.nex4up_chat_messages
    where customer_email = v_email
    order by created_at desc, id desc
    limit v_lim
  ) sub;

  return jsonb_build_object(
    'ok', true,
    'email', v_email,
    'chatToken', coalesce(v_chat_token, ''),
    'messages', v_msgs
  );
end;
$$;

-- 10. Admin RPC: Mark Thread Read by Admin (~100 ms)
create or replace function public.nex4up_s4_admin_mark_read(
  p_admin_token text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_updated int := 0;
  v_total_unread int := 0;
begin
  if not public._nex4up_s4_is_valid_admin(p_admin_token) then
    return jsonb_build_object('ok', false, 'error', 'invalid_admin_token');
  end if;

  if v_email <> '' then
    update public.nex4up_chat_messages
    set read_by_admin = true
    where customer_email = v_email
      and sender = 'customer'
      and read_by_admin = false;
    get diagnostics v_updated = row_count;
  end if;

  select count(*)::int into v_total_unread
  from public.nex4up_chat_messages
  where sender = 'customer' and read_by_admin = false;

  return jsonb_build_object('ok', true, 'updated', v_updated, 'totalUnread', v_total_unread);
end;
$$;

-- 11. Admin RPC: Fast Total Admin Unread Count (~100 ms)
create or replace function public.nex4up_s4_admin_unread_count(
  p_admin_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_unread int := 0;
begin
  if not public._nex4up_s4_is_valid_admin(p_admin_token) then
    return jsonb_build_object('ok', false, 'error', 'invalid_admin_token');
  end if;

  select count(*)::int into v_total_unread
  from public.nex4up_chat_messages
  where sender = 'customer' and read_by_admin = false;

  return jsonb_build_object('ok', true, 'unread', v_total_unread);
end;
$$;

-- 12. Admin RPC: Fast Admin Reply (~100 ms, idempotent, supports Start New Chat)
create or replace function public.nex4up_s4_admin_send_message(
  p_admin_token text,
  p_email text,
  p_message text default '',
  p_image_url text default '',
  p_client_msg_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_msg text := left(trim(coalesce(p_message, '')), 4000);
  v_img text := left(trim(coalesce(p_image_url, '')), 1000);
  v_cid text := nullif(left(trim(coalesce(p_client_msg_id, '')), 80), '');
  v_chat_token text;
  v_row public.nex4up_chat_messages%rowtype;
begin
  if not public._nex4up_s4_is_valid_admin(p_admin_token) then
    return jsonb_build_object('ok', false, 'error', 'invalid_admin_token');
  end if;

  if v_email = '' or (v_msg = '' and v_img = '') then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  insert into public.nex4up_chat_threads (email, customer_name, last_message_at, updated_at)
  values (v_email, '', now(), now())
  on conflict (email) do update
  set last_message_at = now(),
      updated_at = now()
  returning chat_token into v_chat_token;

  if v_cid is not null then
    select * into v_row
    from public.nex4up_chat_messages
    where client_msg_id = v_cid
    limit 1;
  end if;

  if v_row.id is null then
    insert into public.nex4up_chat_messages (
      client_msg_id, customer_email, customer_name, sender, message, image_url,
      read_by_customer, read_by_admin, created_at
    )
    values (
      v_cid, v_email, 'Admin', 'admin', v_msg, v_img,
      false, true, now()
    )
    returning * into v_row;
  end if;

  update public.nex4up_chat_messages
  set read_by_admin = true
  where customer_email = v_email
    and sender = 'customer'
    and read_by_admin = false;

  return jsonb_build_object(
    'ok', true,
    'chat_token', v_chat_token,
    'message', jsonb_build_object(
      'id', v_row.id,
      'client_msg_id', v_row.client_msg_id,
      'email', v_row.customer_email,
      'name', 'Admin',
      'sender', 'admin',
      'message', v_row.message,
      'imageUrl', v_row.image_url,
      'date', to_char(v_row.created_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI:SS'),
      'createdAt', v_row.created_at
    )
  );
end;
$$;

-- 13. Admin RPC: Fast Full Orders List (~150-250 ms for Orders + Payment Approval)
create or replace function public.nex4up_s4_admin_get_orders(
  p_admin_token text,
  p_limit int default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lim int := greatest(1, least(coalesce(p_limit, 500), 1000));
  v_orders jsonb := '[]'::jsonb;
begin
  if not public._nex4up_s4_is_valid_admin(p_admin_token) then
    return jsonb_build_object('ok', false, 'error', 'invalid_admin_token');
  end if;

  select coalesce(
    jsonb_agg(sub.order_payload order by sub.created_at desc, sub.order_id desc),
    '[]'::jsonb
  )
  into v_orders
  from (
    select order_id, order_payload, created_at
    from public.nex4up_admin_orders
    order by created_at desc, order_id desc
    limit v_lim
  ) sub;

  return jsonb_build_object('ok', true, 'orders', v_orders);
end;
$$;

-- 14. Admin RPC: Fast Admin Dashboard Cache Read (~120 ms)
create or replace function public.nex4up_s4_admin_get_cache(
  p_admin_token text,
  p_cache_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := trim(coalesce(p_cache_key, ''));
  v_row public.nex4up_admin_cache%rowtype;
begin
  if not public._nex4up_s4_is_valid_admin(p_admin_token) then
    return jsonb_build_object('ok', false, 'error', 'invalid_admin_token');
  end if;

  if v_key = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_key');
  end if;

  select * into v_row
  from public.nex4up_admin_cache
  where cache_key = v_key;

  if v_row.cache_key is null then
    return jsonb_build_object('ok', true, 'found', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'found', true,
    'payload', v_row.payload,
    'updatedAt', v_row.updated_at
  );
end;
$$;

-- 15. Backend-Only (service_role / GAS) RPCs
create or replace function public.nex4up_s4_service_issue_admin_session(
  p_ttl_hours int default 24
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ttl int := greatest(1, least(coalesce(p_ttl_hours, 24), 72));
  v_tok text;
  v_exp timestamptz;
  v_ch_key text;
begin
  delete from public.nex4up_admin_sessions
  where revoked = true or expires_at < now() - interval '1 hour';

  insert into public.nex4up_admin_sessions (expires_at)
  values (now() + make_interval(hours => v_ttl))
  returning admin_token, expires_at into v_tok, v_exp;

  insert into public.nex4up_admin_config (config_key, config_val)
  values ('realtime_channel_key', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  on conflict (config_key) do nothing;

  select config_val into v_ch_key
  from public.nex4up_admin_config
  where config_key = 'realtime_channel_key';

  return jsonb_build_object(
    'ok', true,
    'admin_token', v_tok,
    'channel_key', v_ch_key,
    'expires_at', v_exp
  );
end;
$$;

create or replace function public.nex4up_s4_service_get_channel_key()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ch_key text;
begin
  insert into public.nex4up_admin_config (config_key, config_val)
  values ('realtime_channel_key', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  on conflict (config_key) do nothing;

  select config_val into v_ch_key
  from public.nex4up_admin_config
  where config_key = 'realtime_channel_key';

  return jsonb_build_object('ok', true, 'channel_key', v_ch_key);
end;
$$;

create or replace function public.nex4up_s4_service_upsert_admin_order(
  p_order jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oid text := trim(coalesce(p_order->>'order_id', ''));
  v_ch_key text;
begin
  if v_oid = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_order_id');
  end if;

  insert into public.nex4up_admin_orders (
    order_id, customer_email, payment_status, fulfilment_status, payment_method,
    total_rm, has_receipt, order_payload, created_at, updated_at
  )
  values (
    v_oid,
    lower(trim(coalesce(p_order->>'customer_email', ''))),
    coalesce(p_order->>'payment_status', ''),
    coalesce(p_order->>'fulfilment_status', ''),
    coalesce(p_order->>'payment_method', ''),
    coalesce((p_order->>'total_rm')::numeric, 0),
    coalesce((p_order->>'has_receipt')::boolean, false),
    coalesce(p_order->'order_payload', '{}'::jsonb),
    coalesce(nullif(trim(coalesce(p_order->>'created_at', '')), '')::timestamptz, now()),
    now()
  )
  on conflict (order_id) do update
  set customer_email = excluded.customer_email,
      payment_status = excluded.payment_status,
      fulfilment_status = excluded.fulfilment_status,
      payment_method = excluded.payment_method,
      total_rm = excluded.total_rm,
      has_receipt = excluded.has_receipt,
      order_payload = excluded.order_payload,
      updated_at = now();

  select config_val into v_ch_key
  from public.nex4up_admin_config
  where config_key = 'realtime_channel_key';

  return jsonb_build_object('ok', true, 'order_id', v_oid, 'channel_key', coalesce(v_ch_key, ''));
end;
$$;

create or replace function public.nex4up_s4_service_backfill_admin_orders(
  p_orders jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_oid text;
  v_count int := 0;
begin
  if p_orders is null or jsonb_typeof(p_orders) <> 'array' then
    return jsonb_build_object('ok', true, 'synced', 0);
  end if;

  for v_item in select * from jsonb_array_elements(p_orders) loop
    v_oid := trim(coalesce(v_item->>'order_id', ''));
    if v_oid = '' then continue; end if;

    insert into public.nex4up_admin_orders (
      order_id, customer_email, payment_status, fulfilment_status, payment_method,
      total_rm, has_receipt, order_payload, created_at, updated_at
    )
    values (
      v_oid,
      lower(trim(coalesce(v_item->>'customer_email', ''))),
      coalesce(v_item->>'payment_status', ''),
      coalesce(v_item->>'fulfilment_status', ''),
      coalesce(v_item->>'payment_method', ''),
      coalesce((v_item->>'total_rm')::numeric, 0),
      coalesce((v_item->>'has_receipt')::boolean, false),
      coalesce(v_item->'order_payload', '{}'::jsonb),
      coalesce(nullif(trim(coalesce(v_item->>'created_at', '')), '')::timestamptz, now()),
      now()
    )
    on conflict (order_id) do update
    set customer_email = excluded.customer_email,
        payment_status = excluded.payment_status,
        fulfilment_status = excluded.fulfilment_status,
        payment_method = excluded.payment_method,
        total_rm = excluded.total_rm,
        has_receipt = excluded.has_receipt,
        order_payload = excluded.order_payload,
        updated_at = now();

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'synced', v_count);
end;
$$;

create or replace function public.nex4up_s4_service_set_admin_cache(
  p_cache_key text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := trim(coalesce(p_cache_key, ''));
begin
  if v_key = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_key');
  end if;

  insert into public.nex4up_admin_cache (cache_key, payload, updated_at)
  values (v_key, coalesce(p_payload, '{}'::jsonb), now())
  on conflict (cache_key) do update
  set payload = excluded.payload,
      updated_at = now();

  return jsonb_build_object('ok', true, 'cache_key', v_key);
end;
$$;

create or replace function public.nex4up_s4_service_backfill_inbox_threads(
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_em text;
  v_cid text;
  v_count int := 0;
begin
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    return jsonb_build_object('ok', true, 'inserted', 0);
  end if;

  for v_item in select * from jsonb_array_elements(p_rows) loop
    v_em := lower(trim(coalesce(v_item->>'email', '')));
    v_cid := nullif(left(trim(coalesce(v_item->>'client_msg_id', '')), 80), '');
    if v_em = '' then continue; end if;

    insert into public.nex4up_chat_threads (email, customer_name, last_message_at, updated_at)
    values (
      v_em,
      left(trim(coalesce(v_item->>'name', '')), 120),
      coalesce(nullif(trim(coalesce(v_item->>'created_at', '')), '')::timestamptz, now()),
      now()
    )
    on conflict (email) do update
    set customer_name = case
          when excluded.customer_name <> '' and public.nex4up_chat_threads.customer_name = ''
          then excluded.customer_name
          else public.nex4up_chat_threads.customer_name
        end,
        last_message_at = greatest(public.nex4up_chat_threads.last_message_at, excluded.last_message_at),
        updated_at = now();

    insert into public.nex4up_chat_messages (
      client_msg_id, customer_email, customer_name, sender, message, image_url,
      read_by_customer, read_by_admin, created_at
    )
    values (
      v_cid,
      v_em,
      left(trim(coalesce(v_item->>'name', '')), 120),
      case when lower(coalesce(v_item->>'sender', '')) = 'admin' then 'admin' else 'customer' end,
      left(coalesce(v_item->>'message', ''), 4000),
      left(trim(coalesce(v_item->>'image_url', '')), 1000),
      coalesce((v_item->>'read_by_customer')::boolean, true),
      coalesce((v_item->>'read_by_admin')::boolean, false),
      coalesce(nullif(trim(coalesce(v_item->>'created_at', '')), '')::timestamptz, now())
    )
    on conflict (client_msg_id) do nothing;

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'inserted', v_count);
end;
$$;

-- 16. Strict Function Permissions
revoke all on function public._nex4up_s4_is_valid_admin(text) from public, anon, authenticated;

revoke all on function public.nex4up_s4_admin_logout(text) from public;
revoke all on function public.nex4up_s4_admin_get_conversations(text, int) from public;
revoke all on function public.nex4up_s4_admin_get_messages(text, text, int) from public;
revoke all on function public.nex4up_s4_admin_mark_read(text, text) from public;
revoke all on function public.nex4up_s4_admin_unread_count(text) from public;
revoke all on function public.nex4up_s4_admin_send_message(text, text, text, text, text) from public;
revoke all on function public.nex4up_s4_admin_get_orders(text, int) from public;
revoke all on function public.nex4up_s4_admin_get_cache(text, text) from public;

grant execute on function public.nex4up_s4_admin_logout(text) to anon, authenticated, service_role;
grant execute on function public.nex4up_s4_admin_get_conversations(text, int) to anon, authenticated, service_role;
grant execute on function public.nex4up_s4_admin_get_messages(text, text, int) to anon, authenticated, service_role;
grant execute on function public.nex4up_s4_admin_mark_read(text, text) to anon, authenticated, service_role;
grant execute on function public.nex4up_s4_admin_unread_count(text) to anon, authenticated, service_role;
grant execute on function public.nex4up_s4_admin_send_message(text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.nex4up_s4_admin_get_orders(text, int) to anon, authenticated, service_role;
grant execute on function public.nex4up_s4_admin_get_cache(text, text) to anon, authenticated, service_role;

revoke all on function public.nex4up_s4_service_issue_admin_session(int) from public, anon, authenticated;
revoke all on function public.nex4up_s4_service_get_channel_key() from public, anon, authenticated;
revoke all on function public.nex4up_s4_service_upsert_admin_order(jsonb) from public, anon, authenticated;
revoke all on function public.nex4up_s4_service_backfill_admin_orders(jsonb) from public, anon, authenticated;
revoke all on function public.nex4up_s4_service_set_admin_cache(text, jsonb) from public, anon, authenticated;
revoke all on function public.nex4up_s4_service_backfill_inbox_threads(jsonb) from public, anon, authenticated;

grant execute on function public.nex4up_s4_service_issue_admin_session(int) to service_role;
grant execute on function public.nex4up_s4_service_get_channel_key() to service_role;
grant execute on function public.nex4up_s4_service_upsert_admin_order(jsonb) to service_role;
grant execute on function public.nex4up_s4_service_backfill_admin_orders(jsonb) to service_role;
grant execute on function public.nex4up_s4_service_set_admin_cache(text, jsonb) to service_role;
grant execute on function public.nex4up_s4_service_backfill_inbox_threads(jsonb) to service_role;

notify pgrst, 'reload schema';
