-- =====================================================================
-- NEX4UP Stage 2: Instant Storefront Cache + Live Order Tracking + Live Notification Bell
-- Applied on Supabase Project: https://sgmyphflffpeqjmivfwq.supabase.co
-- =====================================================================

-- 1. Public Storefront Cache (read-only public catalog snapshot, ZERO private/PII data)
create table if not exists public.nex4up_storefront_cache (
  cache_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nex4up_storefront_cache enable row level security;
revoke all on public.nex4up_storefront_cache from anon, authenticated;
grant select on public.nex4up_storefront_cache to anon, authenticated;

drop policy if exists "Public read storefront cache" on public.nex4up_storefront_cache;
create policy "Public read storefront cache"
  on public.nex4up_storefront_cache
  for select
  to anon, authenticated
  using (cache_key in ('store_bootstrap_v1'));

-- 2. Live Customer Orders (strict RLS — NO direct anon/authenticated table access)
create table if not exists public.nex4up_orders_live (
  order_id text primary key,
  customer_email text not null,
  payment_status text not null default '',
  fulfilment_status text not null default '',
  customer_status text not null default '',
  order_tab text not null default 'All',
  total_rm numeric(10,2) not null default 0,
  payment_method text not null default '',
  method_key text not null default 'mae',
  items_summary text not null default '',
  has_receipt boolean not null default false,
  tracking_number text not null default '',
  tracking_url text not null default '',
  queue_position int,
  order_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_nex4up_orders_live_email_created
  on public.nex4up_orders_live (customer_email, created_at desc, order_id desc);

alter table public.nex4up_orders_live enable row level security;
revoke all on public.nex4up_orders_live from anon, authenticated;

-- 3. Live Customer Notifications (strict RLS — NO direct anon/authenticated table access)
create table if not exists public.nex4up_notifications_live (
  notif_id text primary key,
  customer_email text not null,
  notif_type text not null default 'SYSTEM',
  category text not null default 'system',
  title text not null default '',
  message text not null default '',
  target_tab text not null default 'account',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_nex4up_notifications_live_email_created
  on public.nex4up_notifications_live (customer_email, created_at desc);

create index if not exists idx_nex4up_notifications_live_unread
  on public.nex4up_notifications_live (customer_email)
  where is_read = false;

alter table public.nex4up_notifications_live enable row level security;
revoke all on public.nex4up_notifications_live from anon, authenticated;

-- 4. Customer RPC: Fast My Orders (requires verified registered stream_token)
create or replace function public.nex4up_s2_get_my_orders(
  p_email text,
  p_stream_token text,
  p_limit int default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_stream_token, ''));
  v_lim int := greatest(1, least(coalesce(p_limit, 100), 200));
  v_orders jsonb;
begin
  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token and is_registered = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select coalesce(
    jsonb_agg(sub.order_payload order by sub.created_at desc, sub.order_id desc),
    '[]'::jsonb
  )
  into v_orders
  from (
    select order_id, order_payload, created_at
    from public.nex4up_orders_live
    where customer_email = v_email
    order by created_at desc, order_id desc
    limit v_lim
  ) sub;

  return jsonb_build_object('ok', true, 'orders', v_orders);
end;
$$;

-- 5. Public RPC: Non-PII Track Order by Exact Order ID (no email/phone/game IDs leaked)
create or replace function public.nex4up_s2_track_order_by_id(
  p_order_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oid text := upper(trim(coalesce(p_order_id, '')));
  v_row public.nex4up_orders_live%rowtype;
begin
  if v_oid = '' or length(v_oid) < 4 then
    return jsonb_build_object('ok', false, 'found', false, 'error', 'invalid_order_id');
  end if;

  select * into v_row
  from public.nex4up_orders_live
  where upper(order_id) = v_oid
  limit 1;

  if v_row.order_id is null then
    return jsonb_build_object('ok', true, 'found', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'found', true,
    'orderId', v_row.order_id,
    'amount', v_row.total_rm,
    'paymentMethod', coalesce(nullif(v_row.payment_method, ''), 'MAE'),
    'methodKey', coalesce(nullif(v_row.method_key, ''), 'mae'),
    'status', coalesce(nullif(v_row.customer_status, ''), v_row.payment_status),
    'paymentStatus', v_row.payment_status,
    'fulfilmentStatus', v_row.fulfilment_status,
    'items', v_row.items_summary,
    'hasReceipt', v_row.has_receipt,
    'trackingNumber', v_row.tracking_number,
    'trackingUrl', v_row.tracking_url,
    'queuePosition', v_row.queue_position,
    'updatedAt', v_row.updated_at
  );
end;
$$;

-- 6. Customer RPC: Fast Notifications List + Unread Count (requires verified registered stream_token)
create or replace function public.nex4up_s2_get_notifications(
  p_email text,
  p_stream_token text,
  p_limit int default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_stream_token, ''));
  v_lim int := greatest(1, least(coalesce(p_limit, 50), 100));
  v_notifs jsonb;
  v_unread int := 0;
begin
  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token and is_registered = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', sub.notif_id,
        'notifId', sub.notif_id,
        'type', sub.notif_type,
        'category', sub.category,
        'title', sub.title,
        'message', sub.message,
        'targetTab', sub.target_tab,
        'read', sub.is_read,
        'createdAt', sub.created_at
      )
      order by sub.created_at desc
    ),
    '[]'::jsonb
  )
  into v_notifs
  from (
    select notif_id, notif_type, category, title, message, target_tab, is_read, created_at
    from public.nex4up_notifications_live
    where customer_email = v_email
    order by created_at desc
    limit v_lim
  ) sub;

  select count(*) into v_unread
  from public.nex4up_notifications_live
  where customer_email = v_email and is_read = false;

  return jsonb_build_object('ok', true, 'notifications', v_notifs, 'unread', v_unread);
end;
$$;

-- 7. Customer RPC: Fast Mark All Notifications Read
create or replace function public.nex4up_s2_mark_notifications_read(
  p_email text,
  p_stream_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_stream_token, ''));
  v_updated int := 0;
begin
  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token and is_registered = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  update public.nex4up_notifications_live
  set is_read = true
  where customer_email = v_email and is_read = false;

  get diagnostics v_updated = row_count;
  return jsonb_build_object('ok', true, 'updated', v_updated);
end;
$$;

-- 8. Backend-Only (service_role / GAS) RPC: Update Public Storefront Cache
create or replace function public.nex4up_s2_service_set_store_cache(
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

  insert into public.nex4up_storefront_cache (cache_key, payload, updated_at)
  values (v_key, coalesce(p_payload, '{}'::jsonb), now())
  on conflict (cache_key) do update
  set payload = excluded.payload,
      updated_at = now();

  return jsonb_build_object('ok', true, 'cache_key', v_key);
end;
$$;

-- 9. Backend-Only (service_role / GAS) RPC: Upsert Single Order & Return chat_token for Live Push
create or replace function public.nex4up_s2_service_upsert_order(
  p_order jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_oid text := trim(coalesce(p_order->>'order_id', ''));
  v_email text := lower(trim(coalesce(p_order->>'customer_email', '')));
  v_token text;
  v_qpos int := nullif(trim(coalesce(p_order->>'queue_position', '')), '')::int;
  v_ts timestamptz := coalesce(nullif(trim(coalesce(p_order->>'created_at', '')), '')::timestamptz, now());
begin
  if v_oid = '' or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_order_or_email');
  end if;

  insert into public.nex4up_chat_threads (email, customer_name, is_registered)
  values (v_email, left(coalesce(p_order->>'customer_name', ''), 120), true)
  on conflict (email) do update
  set is_registered = true,
      updated_at = now()
  returning chat_token into v_token;

  insert into public.nex4up_orders_live (
    order_id, customer_email, payment_status, fulfilment_status, customer_status,
    order_tab, total_rm, payment_method, method_key, items_summary, has_receipt,
    tracking_number, tracking_url, queue_position, order_payload, created_at, updated_at
  )
  values (
    v_oid,
    v_email,
    left(coalesce(p_order->>'payment_status', ''), 80),
    left(coalesce(p_order->>'fulfilment_status', ''), 80),
    left(coalesce(p_order->>'customer_status', ''), 120),
    left(coalesce(p_order->>'order_tab', 'All'), 40),
    coalesce(nullif(trim(coalesce(p_order->>'total_rm', '')), '')::numeric, 0),
    left(coalesce(p_order->>'payment_method', ''), 80),
    left(coalesce(p_order->>'method_key', 'mae'), 40),
    left(coalesce(p_order->>'items_summary', ''), 1000),
    coalesce((p_order->>'has_receipt')::boolean, false),
    left(coalesce(p_order->>'tracking_number', ''), 120),
    left(coalesce(p_order->>'tracking_url', ''), 500),
    v_qpos,
    coalesce(p_order->'order_payload', '{}'::jsonb),
    v_ts,
    now()
  )
  on conflict (order_id) do update
  set payment_status = excluded.payment_status,
      fulfilment_status = excluded.fulfilment_status,
      customer_status = excluded.customer_status,
      order_tab = excluded.order_tab,
      total_rm = excluded.total_rm,
      payment_method = excluded.payment_method,
      method_key = excluded.method_key,
      items_summary = excluded.items_summary,
      has_receipt = excluded.has_receipt,
      tracking_number = excluded.tracking_number,
      tracking_url = excluded.tracking_url,
      queue_position = excluded.queue_position,
      order_payload = excluded.order_payload,
      updated_at = now();

  return jsonb_build_object(
    'ok', true,
    'chat_token', v_token,
    'order_id', v_oid,
    'customer_status', left(coalesce(p_order->>'customer_status', ''), 120),
    'order_payload', coalesce(p_order->'order_payload', '{}'::jsonb)
  );
end;
$$;

-- 10. Backend-Only (service_role / GAS) RPC: Bulk Backfill Customer Orders
create or replace function public.nex4up_s2_service_backfill_orders(
  p_email text,
  p_orders jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_item jsonb;
  v_count int := 0;
  v_oid text;
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_orders, '[]'::jsonb))
  loop
    v_oid := trim(coalesce(v_item->>'order_id', ''));
    if v_oid = '' then continue; end if;

    insert into public.nex4up_orders_live (
      order_id, customer_email, payment_status, fulfilment_status, customer_status,
      order_tab, total_rm, payment_method, method_key, items_summary, has_receipt,
      tracking_number, tracking_url, queue_position, order_payload, created_at, updated_at
    )
    values (
      v_oid,
      v_email,
      left(coalesce(v_item->>'payment_status', ''), 80),
      left(coalesce(v_item->>'fulfilment_status', ''), 80),
      left(coalesce(v_item->>'customer_status', ''), 120),
      left(coalesce(v_item->>'order_tab', 'All'), 40),
      coalesce(nullif(trim(coalesce(v_item->>'total_rm', '')), '')::numeric, 0),
      left(coalesce(v_item->>'payment_method', ''), 80),
      left(coalesce(v_item->>'method_key', 'mae'), 40),
      left(coalesce(v_item->>'items_summary', ''), 1000),
      coalesce((v_item->>'has_receipt')::boolean, false),
      left(coalesce(v_item->>'tracking_number', ''), 120),
      left(coalesce(v_item->>'tracking_url', ''), 500),
      nullif(trim(coalesce(v_item->>'queue_position', '')), '')::int,
      coalesce(v_item->'order_payload', '{}'::jsonb),
      coalesce(nullif(trim(coalesce(v_item->>'created_at', '')), '')::timestamptz, now()),
      now()
    )
    on conflict (order_id) do update
    set payment_status = excluded.payment_status,
        fulfilment_status = excluded.fulfilment_status,
        customer_status = excluded.customer_status,
        order_tab = excluded.order_tab,
        total_rm = excluded.total_rm,
        payment_method = excluded.payment_method,
        method_key = excluded.method_key,
        items_summary = excluded.items_summary,
        has_receipt = excluded.has_receipt,
        tracking_number = excluded.tracking_number,
        tracking_url = excluded.tracking_url,
        queue_position = excluded.queue_position,
        order_payload = excluded.order_payload,
        updated_at = now();

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'synced', v_count);
end;
$$;

-- 11. Backend-Only (service_role / GAS) RPC: Insert Notification & Return chat_token for Live Bell Push
create or replace function public.nex4up_s2_service_insert_notification(
  p_notif jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nid text := trim(coalesce(p_notif->>'notif_id', ''));
  v_email text := lower(trim(coalesce(p_notif->>'customer_email', '')));
  v_token text;
  v_ts timestamptz := coalesce(nullif(trim(coalesce(p_notif->>'created_at', '')), '')::timestamptz, now());
  v_row public.nex4up_notifications_live%rowtype;
begin
  if v_nid = '' or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_notif_or_email');
  end if;

  insert into public.nex4up_chat_threads (email, customer_name, is_registered)
  values (v_email, '', true)
  on conflict (email) do update
  set is_registered = true,
      updated_at = now()
  returning chat_token into v_token;

  insert into public.nex4up_notifications_live (
    notif_id, customer_email, notif_type, category, title, message, target_tab, is_read, created_at
  )
  values (
    v_nid,
    v_email,
    left(coalesce(p_notif->>'notif_type', 'SYSTEM'), 40),
    left(coalesce(p_notif->>'category', 'system'), 30),
    left(coalesce(p_notif->>'title', 'NEX4UP'), 200),
    left(coalesce(p_notif->>'message', ''), 1000),
    left(coalesce(p_notif->>'target_tab', 'account'), 40),
    coalesce((p_notif->>'is_read')::boolean, false),
    v_ts
  )
  on conflict (notif_id) do nothing
  returning * into v_row;

  if v_row.notif_id is null then
    select * into v_row from public.nex4up_notifications_live where notif_id = v_nid;
  end if;

  return jsonb_build_object(
    'ok', true,
    'chat_token', v_token,
    'notification', jsonb_build_object(
      'id', v_row.notif_id,
      'notifId', v_row.notif_id,
      'type', v_row.notif_type,
      'category', v_row.category,
      'title', v_row.title,
      'message', v_row.message,
      'targetTab', v_row.target_tab,
      'read', v_row.is_read,
      'createdAt', v_row.created_at
    )
  );
end;
$$;

-- 12. Backend-Only (service_role / GAS) RPC: Bulk Backfill Customer Notifications
create or replace function public.nex4up_s2_service_backfill_notifications(
  p_email text,
  p_rows jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_item jsonb;
  v_count int := 0;
  v_rc int := 0;
  v_nid text;
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    v_nid := trim(coalesce(v_item->>'notif_id', ''));
    if v_nid = '' then continue; end if;

    insert into public.nex4up_notifications_live (
      notif_id, customer_email, notif_type, category, title, message, target_tab, is_read, created_at
    )
    values (
      v_nid,
      v_email,
      left(coalesce(v_item->>'notif_type', 'SYSTEM'), 40),
      left(coalesce(v_item->>'category', 'system'), 30),
      left(coalesce(v_item->>'title', 'NEX4UP'), 200),
      left(coalesce(v_item->>'message', ''), 1000),
      left(coalesce(v_item->>'target_tab', 'account'), 40),
      coalesce((v_item->>'is_read')::boolean, false),
      coalesce(nullif(trim(coalesce(v_item->>'created_at', '')), '')::timestamptz, now())
    )
    on conflict (notif_id) do nothing;

    get diagnostics v_rc = row_count;
    v_count := v_count + v_rc;
  end loop;

  return jsonb_build_object('ok', true, 'inserted', v_count);
end;
$$;

-- 13. Strict Function Permissions
revoke all on function public.nex4up_s2_get_my_orders(text, text, int) from public;
revoke all on function public.nex4up_s2_track_order_by_id(text) from public;
revoke all on function public.nex4up_s2_get_notifications(text, text, int) from public;
revoke all on function public.nex4up_s2_mark_notifications_read(text, text) from public;

grant execute on function public.nex4up_s2_get_my_orders(text, text, int) to anon, authenticated, service_role;
grant execute on function public.nex4up_s2_track_order_by_id(text) to anon, authenticated, service_role;
grant execute on function public.nex4up_s2_get_notifications(text, text, int) to anon, authenticated, service_role;
grant execute on function public.nex4up_s2_mark_notifications_read(text, text) to anon, authenticated, service_role;

revoke all on function public.nex4up_s2_service_set_store_cache(text, jsonb) from public, anon, authenticated;
revoke all on function public.nex4up_s2_service_upsert_order(jsonb) from public, anon, authenticated;
revoke all on function public.nex4up_s2_service_backfill_orders(text, jsonb) from public, anon, authenticated;
revoke all on function public.nex4up_s2_service_insert_notification(jsonb) from public, anon, authenticated;
revoke all on function public.nex4up_s2_service_backfill_notifications(text, jsonb) from public, anon, authenticated;

grant execute on function public.nex4up_s2_service_set_store_cache(text, jsonb) to service_role;
grant execute on function public.nex4up_s2_service_upsert_order(jsonb) to service_role;
grant execute on function public.nex4up_s2_service_backfill_orders(text, jsonb) to service_role;
grant execute on function public.nex4up_s2_service_insert_notification(jsonb) to service_role;
grant execute on function public.nex4up_s2_service_backfill_notifications(text, jsonb) to service_role;

notify pgrst, 'reload schema';
