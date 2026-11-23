-- =====================================================================
-- NEX4UP Stage 1: Real-Time Customer Live Chat (Hybrid with Google Drive)
-- Applied on Supabase Project: https://sgmyphflffpeqjmivfwq.supabase.co
-- =====================================================================

-- 1. Chat Threads (1 per customer email, holds unguessable 64-char capability token)
create table if not exists public.nex4up_chat_threads (
  email text primary key,
  customer_name text not null default '',
  chat_token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  is_registered boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Chat Messages (text + Google Drive image URLs only)
create table if not exists public.nex4up_chat_messages (
  id bigint generated always as identity primary key,
  client_msg_id text unique,
  customer_email text not null references public.nex4up_chat_threads(email) on delete cascade,
  customer_name text not null default '',
  sender text not null check (sender in ('customer', 'admin')),
  message text not null default '',
  image_url text not null default '',
  read_by_customer boolean not null default false,
  read_by_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_nex4up_chat_messages_email_created
  on public.nex4up_chat_messages (customer_email, created_at asc, id asc);

create index if not exists idx_nex4up_chat_messages_unread_customer
  on public.nex4up_chat_messages (customer_email)
  where sender = 'admin' and read_by_customer = false;

-- 3. Strict RLS: Block all direct anon/authenticated table access
alter table public.nex4up_chat_threads enable row level security;
alter table public.nex4up_chat_messages enable row level security;

revoke all on public.nex4up_chat_threads from anon, authenticated;
revoke all on public.nex4up_chat_messages from anon, authenticated;

-- 4. Customer RPC: Initialize brand-new guest thread (does NOT expose existing accounts/threads)
create or replace function public.nex4up_chat_guest_init(
  p_email text,
  p_name text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := left(trim(coalesce(p_name, '')), 120);
  v_token text;
begin
  if v_email = '' or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  if exists (select 1 from public.nex4up_chat_threads where email = v_email)
     or exists (select 1 from public.nex4up_profiles where lower(email) = v_email) then
    return jsonb_build_object('ok', false, 'requires_auth', true);
  end if;

  insert into public.nex4up_chat_threads (email, customer_name, is_registered)
  values (v_email, v_name, false)
  returning chat_token into v_token;

  return jsonb_build_object('ok', true, 'email', v_email, 'chat_token', v_token);
end;
$$;

-- 5. Customer RPC: Fetch messages for verified (email + chat_token)
create or replace function public.nex4up_chat_get_messages(
  p_email text,
  p_chat_token text,
  p_limit int default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_chat_token, ''));
  v_lim int := greatest(1, least(coalesce(p_limit, 100), 200));
  v_msgs jsonb;
begin
  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

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
        'readByCustomer', sub.read_by_customer,
        'createdAt', sub.created_at
      )
      order by sub.created_at asc, sub.id asc
    ),
    '[]'::jsonb
  )
  into v_msgs
  from (
    select id, client_msg_id, customer_email, customer_name, sender, message, image_url, read_by_customer, created_at
    from public.nex4up_chat_messages
    where customer_email = v_email
    order by created_at desc, id desc
    limit v_lim
  ) sub;

  return jsonb_build_object('ok', true, 'messages', v_msgs);
end;
$$;

-- 6. Customer RPC: Send customer text/link message (idempotent via client_msg_id)
create or replace function public.nex4up_chat_send_message(
  p_email text,
  p_chat_token text,
  p_name text default '',
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
  v_token text := trim(coalesce(p_chat_token, ''));
  v_name text := left(trim(coalesce(p_name, '')), 120);
  v_msg text := left(trim(coalesce(p_message, '')), 4000);
  v_img text := left(trim(coalesce(p_image_url, '')), 1000);
  v_cid text := nullif(left(trim(coalesce(p_client_msg_id, '')), 80), '');
  v_row public.nex4up_chat_messages%rowtype;
begin
  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if v_msg = '' and v_img = '' then
    return jsonb_build_object('ok', false, 'error', 'empty_message');
  end if;

  if v_img <> '' and v_img !~ '^https?://' then
    return jsonb_build_object('ok', false, 'error', 'invalid_image_url');
  end if;

  insert into public.nex4up_chat_messages (
    client_msg_id, customer_email, customer_name, sender, message, image_url, read_by_customer, read_by_admin
  )
  values (
    v_cid, v_email, v_name, 'customer', v_msg, v_img, true, false
  )
  on conflict (client_msg_id) do nothing
  returning * into v_row;

  if v_row.id is null then
    if v_cid is not null then
      select * into v_row
      from public.nex4up_chat_messages
      where client_msg_id = v_cid and customer_email = v_email;
    end if;
    if v_row.id is null then
      return jsonb_build_object('ok', false, 'error', 'duplicate_id');
    end if;
  end if;

  update public.nex4up_chat_threads
  set last_message_at = now(),
      updated_at = now(),
      customer_name = case when v_name <> '' then v_name else customer_name end
  where email = v_email;

  return jsonb_build_object(
    'ok', true,
    'message', jsonb_build_object(
      'id', v_row.id,
      'client_msg_id', v_row.client_msg_id,
      'email', v_row.customer_email,
      'name', v_row.customer_name,
      'sender', v_row.sender,
      'message', v_row.message,
      'imageUrl', v_row.image_url,
      'createdAt', v_row.created_at
    )
  );
end;
$$;

-- 7. Customer RPC: Mark admin replies as read
create or replace function public.nex4up_chat_mark_read(
  p_email text,
  p_chat_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_chat_token, ''));
  v_updated int := 0;
begin
  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  update public.nex4up_chat_messages
  set read_by_customer = true
  where customer_email = v_email
    and sender = 'admin'
    and read_by_customer = false;

  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', true, 'updated', v_updated);
end;
$$;

-- 8. Customer RPC: Fast unread count
create or replace function public.nex4up_chat_unread_count(
  p_email text,
  p_chat_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_chat_token, ''));
  v_count int := 0;
begin
  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token', 'unread', 0);
  end if;

  select count(*) into v_count
  from public.nex4up_chat_messages
  where customer_email = v_email
    and sender = 'admin'
    and read_by_customer = false;

  return jsonb_build_object('ok', true, 'unread', v_count);
end;
$$;

-- 9. Backend-Only (service_role / GAS) RPC: Ensure thread & return chat_token + message count
create or replace function public.nex4up_chat_service_ensure_thread(
  p_email text,
  p_name text default '',
  p_is_registered boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := left(trim(coalesce(p_name, '')), 120);
  v_token text;
  v_count int := 0;
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  insert into public.nex4up_chat_threads (email, customer_name, is_registered)
  values (v_email, v_name, coalesce(p_is_registered, false))
  on conflict (email) do update
  set customer_name = case when excluded.customer_name <> '' then excluded.customer_name else public.nex4up_chat_threads.customer_name end,
      is_registered = public.nex4up_chat_threads.is_registered or excluded.is_registered,
      updated_at = now()
  returning chat_token into v_token;

  select count(*) into v_count
  from public.nex4up_chat_messages
  where customer_email = v_email;

  return jsonb_build_object('ok', true, 'email', v_email, 'chat_token', v_token, 'message_count', v_count);
end;
$$;

-- 10. Backend-Only (service_role / GAS) RPC: Mirror admin/image message & return chat_token for Broadcast
create or replace function public.nex4up_chat_service_insert_message(
  p_email text,
  p_name text default '',
  p_sender text default 'admin',
  p_message text default '',
  p_image_url text default '',
  p_client_msg_id text default null,
  p_created_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := left(trim(coalesce(p_name, '')), 120);
  v_sender text := case when lower(trim(coalesce(p_sender, ''))) = 'customer' then 'customer' else 'admin' end;
  v_msg text := left(coalesce(p_message, ''), 4000);
  v_img text := left(trim(coalesce(p_image_url, '')), 1000);
  v_cid text := nullif(left(trim(coalesce(p_client_msg_id, '')), 80), '');
  v_ts timestamptz := coalesce(p_created_at, now());
  v_token text;
  v_row public.nex4up_chat_messages%rowtype;
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  insert into public.nex4up_chat_threads (email, customer_name, last_message_at, updated_at)
  values (v_email, v_name, v_ts, now())
  on conflict (email) do update
  set customer_name = case when excluded.customer_name <> '' then excluded.customer_name else public.nex4up_chat_threads.customer_name end,
      last_message_at = greatest(public.nex4up_chat_threads.last_message_at, v_ts),
      updated_at = now()
  returning chat_token into v_token;

  insert into public.nex4up_chat_messages (
    client_msg_id, customer_email, customer_name, sender, message, image_url,
    read_by_customer, read_by_admin, created_at
  )
  values (
    v_cid, v_email, v_name, v_sender, v_msg, v_img,
    (v_sender = 'customer'), (v_sender = 'admin'), v_ts
  )
  on conflict (client_msg_id) do nothing
  returning * into v_row;

  if v_row.id is null and v_cid is not null then
    select * into v_row from public.nex4up_chat_messages where client_msg_id = v_cid;
  end if;

  return jsonb_build_object(
    'ok', true,
    'chat_token', v_token,
    'message', jsonb_build_object(
      'id', v_row.id,
      'client_msg_id', v_row.client_msg_id,
      'email', v_row.customer_email,
      'name', v_row.customer_name,
      'sender', v_row.sender,
      'message', v_row.message,
      'imageUrl', v_row.image_url,
      'createdAt', v_row.created_at
    )
  );
end;
$$;

-- 11. Backend-Only (service_role / GAS) RPC: One-time history backfill per customer
create or replace function public.nex4up_chat_service_backfill_messages(
  p_email text,
  p_name text default '',
  p_rows jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := left(trim(coalesce(p_name, '')), 120);
  v_token text;
  v_item jsonb;
  v_inserted int := 0;
  v_rc int := 0;
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  insert into public.nex4up_chat_threads (email, customer_name, is_registered)
  values (v_email, v_name, true)
  on conflict (email) do update
  set customer_name = case when excluded.customer_name <> '' then excluded.customer_name else public.nex4up_chat_threads.customer_name end,
      updated_at = now()
  returning chat_token into v_token;

  for v_item in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    insert into public.nex4up_chat_messages (
      client_msg_id, customer_email, customer_name, sender, message, image_url,
      read_by_customer, read_by_admin, created_at
    )
    values (
      nullif(left(trim(coalesce(v_item->>'client_msg_id', '')), 80), ''),
      v_email,
      left(coalesce(v_item->>'name', v_name), 120),
      case when lower(coalesce(v_item->>'sender', '')) = 'admin' then 'admin' else 'customer' end,
      left(coalesce(v_item->>'message', ''), 4000),
      left(coalesce(v_item->>'image_url', ''), 1000),
      coalesce((v_item->>'read_by_customer')::boolean, true),
      coalesce((v_item->>'read_by_admin')::boolean, true),
      coalesce((v_item->>'created_at')::timestamptz, now())
    )
    on conflict (client_msg_id) do nothing;

    get diagnostics v_rc = row_count;
    v_inserted := v_inserted + v_rc;
  end loop;

  return jsonb_build_object('ok', true, 'chat_token', v_token, 'inserted', v_inserted);
end;
$$;

-- 12. Strict Function Permissions
revoke all on function public.nex4up_chat_guest_init(text, text) from public;
revoke all on function public.nex4up_chat_get_messages(text, text, int) from public;
revoke all on function public.nex4up_chat_send_message(text, text, text, text, text, text) from public;
revoke all on function public.nex4up_chat_mark_read(text, text) from public;
revoke all on function public.nex4up_chat_unread_count(text, text) from public;

grant execute on function public.nex4up_chat_guest_init(text, text) to anon, authenticated, service_role;
grant execute on function public.nex4up_chat_get_messages(text, text, int) to anon, authenticated, service_role;
grant execute on function public.nex4up_chat_send_message(text, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.nex4up_chat_mark_read(text, text) to anon, authenticated, service_role;
grant execute on function public.nex4up_chat_unread_count(text, text) to anon, authenticated, service_role;

revoke all on function public.nex4up_chat_service_ensure_thread(text, text, boolean) from public, anon, authenticated;
revoke all on function public.nex4up_chat_service_insert_message(text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.nex4up_chat_service_backfill_messages(text, text, jsonb) from public, anon, authenticated;

grant execute on function public.nex4up_chat_service_ensure_thread(text, text, boolean) to service_role;
grant execute on function public.nex4up_chat_service_insert_message(text, text, text, text, text, text, timestamptz) to service_role;
grant execute on function public.nex4up_chat_service_backfill_messages(text, text, jsonb) to service_role;

-- Reload PostgREST schema cache immediately
notify pgrst, 'reload schema';
