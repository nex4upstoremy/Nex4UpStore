-- =====================================================================
-- NEX4UP Stage 5: Full Hybrid Parity
-- Customer State (Points, Wishlist, Loyalty, Wallet, Referrals, Partner),
-- Product Reviews, Payment QRs Public Cache, and Remaining Admin Tab Caches
-- =====================================================================
-- Rules preserved:
--   - Google Sheets/Drive remain permanent backup & media store (0 MB Supabase Storage)
--   - Reads come from Supabase first; Google Sheets acts as automatic fallback
--   - Admin!B2 & customer passwords NEVER enter Supabase
--   - Uses built-in md5(...) + gen_random_uuid() with set search_path = public

-- 1. Allow read-only public fetch of payment_qrs_v1 alongside Storefront & Community caches
drop policy if exists "Public read storefront cache" on public.nex4up_storefront_cache;
create policy "Public read storefront cache"
  on public.nex4up_storefront_cache
  for select
  to anon, authenticated
  using (cache_key in ('store_bootstrap_v1', 'community_public_v1', 'payment_qrs_v1'));

-- 2. Private per-customer state table (strict RLS — NO direct anon/authenticated access)
create table if not exists public.nex4up_customer_state (
  customer_email text primary key,
  points_balance int not null default 0,
  wishlist_ids jsonb not null default '[]'::jsonb,
  loyalty_payload jsonb,
  wallet_payload jsonb,
  referral_payload jsonb,
  partner_payload jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nex4up_customer_state enable row level security;
revoke all on public.nex4up_customer_state from anon, authenticated;

-- 3. Product reviews cache table (strict RLS — NO direct table reads because reviewer_key exists)
create table if not exists public.nex4up_reviews_live (
  id bigserial primary key,
  game_id text not null,
  reviewer_key text not null,
  customer_name text not null default 'Anonymous',
  customer_profile_image text not null default '',
  rating numeric(3,1) not null default 5,
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (game_id, reviewer_key)
);

create index if not exists idx_nex4up_reviews_live_game
  on public.nex4up_reviews_live (game_id, created_at desc);

alter table public.nex4up_reviews_live enable row level security;
revoke all on public.nex4up_reviews_live from anon, authenticated;

-- 4. Public Read RPC: Fetch product reviews without exposing reviewer email/key
create or replace function public.nex4up_s5_get_reviews(
  p_game_id text,
  p_limit int default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gid text := trim(coalesce(p_game_id, ''));
  v_lim int := greatest(1, least(coalesce(p_limit, 100), 200));
  v_rows jsonb := '[]'::jsonb;
begin
  if v_gid = '' then
    return jsonb_build_object('ok', true, 'gameId', '', 'reviews', '[]'::jsonb);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'customerName', r.customer_name,
        'customerProfileImage', r.customer_profile_image,
        'rating', r.rating,
        'comment', r.comment,
        'date', to_char(r.created_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI'),
        'createdAt', r.created_at
      )
      order by r.created_at desc, r.id desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select id, customer_name, customer_profile_image, rating, comment, created_at
    from public.nex4up_reviews_live
    where game_id = v_gid
    order by created_at desc, id desc
    limit v_lim
  ) r;

  return jsonb_build_object(
    'ok', true,
    'gameId', v_gid,
    'reviews', v_rows
  );
end;
$$;

-- 5. Customer Token-Gated RPC: Read verified private customer state (points, wishlist, loyalty, wallet, referrals, partner)
create or replace function public.nex4up_s5_get_customer_state(
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
  v_row public.nex4up_customer_state%rowtype;
begin
  if v_email = '' or v_token = '' or not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token and is_registered = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select * into v_row
  from public.nex4up_customer_state
  where customer_email = v_email;

  if v_row.customer_email is null then
    return jsonb_build_object('ok', true, 'found', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'found', true,
    'pointsBalance', v_row.points_balance,
    'wishlistIds', coalesce(v_row.wishlist_ids, '[]'::jsonb),
    'loyalty', v_row.loyalty_payload,
    'wallet', v_row.wallet_payload,
    'referral', v_row.referral_payload,
    'partner', v_row.partner_payload,
    'updatedAt', v_row.updated_at
  );
end;
$$;

-- 6. Customer Token-Gated RPC: Atomic fast wishlist toggle in Supabase (~80 ms)
create or replace function public.nex4up_s5_toggle_wishlist_fast(
  p_email text,
  p_chat_token text,
  p_game_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_chat_token, ''));
  v_gid_txt text := trim(coalesce(p_game_id, ''));
  v_gid_val jsonb;
  v_cur jsonb := '[]'::jsonb;
  v_next jsonb := '[]'::jsonb;
  v_exists boolean := false;
  v_added boolean := false;
begin
  if v_email = '' or v_token = '' or not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token and is_registered = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if v_gid_txt = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_game_id');
  end if;

  v_gid_val := case
    when v_gid_txt ~ '^\d+$' then to_jsonb(v_gid_txt::bigint)
    else to_jsonb(v_gid_txt)
  end;

  insert into public.nex4up_customer_state (customer_email)
  values (v_email)
  on conflict (customer_email) do nothing;

  select coalesce(wishlist_ids, '[]'::jsonb)
  into v_cur
  from public.nex4up_customer_state
  where customer_email = v_email
  for update;

  if jsonb_typeof(v_cur) <> 'array' then
    v_cur := '[]'::jsonb;
  end if;

  select exists (
    select 1
    from jsonb_array_elements(v_cur) as e(val)
    where trim(both '"' from e.val::text) = v_gid_txt
  ) into v_exists;

  if v_exists then
    select coalesce(
      jsonb_agg(e.val) filter (where trim(both '"' from e.val::text) <> v_gid_txt),
      '[]'::jsonb
    )
    into v_next
    from jsonb_array_elements(v_cur) as e(val);
    v_added := false;
  else
    v_next := v_cur || jsonb_build_array(v_gid_val);
    v_added := true;
  end if;

  update public.nex4up_customer_state
  set wishlist_ids = v_next,
      updated_at = now()
  where customer_email = v_email;

  return jsonb_build_object(
    'ok', true,
    'added', v_added,
    'wishlistIds', v_next
  );
end;
$$;

-- 7. Customer Token-Gated RPC: Read logged-in user's own review for a game
create or replace function public.nex4up_s5_get_my_review(
  p_email text,
  p_chat_token text,
  p_game_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_chat_token, ''));
  v_gid text := trim(coalesce(p_game_id, ''));
  v_rkey text;
  v_row public.nex4up_reviews_live%rowtype;
begin
  if v_email = '' or v_token = '' or not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token and is_registered = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if v_gid = '' then
    return jsonb_build_object('ok', true, 'found', false, 'review', null);
  end if;

  v_rkey := md5('nex4up_rev:' || v_email);

  select * into v_row
  from public.nex4up_reviews_live
  where game_id = v_gid and reviewer_key = v_rkey;

  if v_row.id is null then
    return jsonb_build_object('ok', true, 'found', false, 'review', null);
  end if;

  return jsonb_build_object(
    'ok', true,
    'found', true,
    'review', jsonb_build_object(
      'rating', v_row.rating,
      'comment', v_row.comment,
      'date', to_char(v_row.created_at at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI'),
      'createdAt', v_row.created_at
    )
  );
end;
$$;

-- 8. Backend-Only (service_role / GAS) RPCs
create or replace function public.nex4up_s5_service_upsert_customer_state(
  p_email text,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_pts_txt text;
  v_has_pts boolean := false;
  v_pts_val int := 0;
  v_has_wish boolean := false;
  v_has_loyalty boolean := false;
  v_has_wallet boolean := false;
  v_has_referral boolean := false;
  v_has_partner boolean := false;
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'invalid_patch');
  end if;

  if (p_patch ? 'pointsBalance') and jsonb_typeof(p_patch->'pointsBalance') <> 'null' then
    v_pts_txt := trim(coalesce(p_patch->>'pointsBalance', ''));
    if v_pts_txt ~ '^-?\d+(\.\d+)?$' then
      v_has_pts := true;
      v_pts_val := round(v_pts_txt::numeric)::int;
    end if;
  end if;

  v_has_wish := (p_patch ? 'wishlistIds') and jsonb_typeof(p_patch->'wishlistIds') = 'array';
  v_has_loyalty := (p_patch ? 'loyalty') and jsonb_typeof(p_patch->'loyalty') <> 'null';
  v_has_wallet := (p_patch ? 'wallet') and jsonb_typeof(p_patch->'wallet') <> 'null';
  v_has_referral := (p_patch ? 'referral') and jsonb_typeof(p_patch->'referral') <> 'null';
  v_has_partner := (p_patch ? 'partner') and jsonb_typeof(p_patch->'partner') <> 'null';

  insert into public.nex4up_customer_state (
    customer_email,
    points_balance,
    wishlist_ids,
    loyalty_payload,
    wallet_payload,
    referral_payload,
    partner_payload,
    updated_at
  )
  values (
    v_email,
    case when v_has_pts then v_pts_val else 0 end,
    case when v_has_wish then p_patch->'wishlistIds' else '[]'::jsonb end,
    case when v_has_loyalty then p_patch->'loyalty' else null end,
    case when v_has_wallet then p_patch->'wallet' else null end,
    case when v_has_referral then p_patch->'referral' else null end,
    case when v_has_partner then p_patch->'partner' else null end,
    now()
  )
  on conflict (customer_email) do update
  set
    points_balance = case when v_has_pts then v_pts_val else public.nex4up_customer_state.points_balance end,
    wishlist_ids = case when v_has_wish then p_patch->'wishlistIds' else public.nex4up_customer_state.wishlist_ids end,
    loyalty_payload = case when v_has_loyalty then p_patch->'loyalty' else public.nex4up_customer_state.loyalty_payload end,
    wallet_payload = case when v_has_wallet then p_patch->'wallet' else public.nex4up_customer_state.wallet_payload end,
    referral_payload = case when v_has_referral then p_patch->'referral' else public.nex4up_customer_state.referral_payload end,
    partner_payload = case when v_has_partner then p_patch->'partner' else public.nex4up_customer_state.partner_payload end,
    updated_at = now();

  return jsonb_build_object('ok', true, 'email', v_email);
end;
$$;

create or replace function public.nex4up_s5_service_replace_game_reviews(
  p_game_id text,
  p_reviews jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gid text := trim(coalesce(p_game_id, ''));
  v_item jsonb;
  v_idx int := 0;
  v_raw_email text;
  v_rkey text;
  v_cname text;
  v_img text;
  v_rating numeric(3,1);
  v_comment text;
  v_ts timestamptz;
  v_date_raw text;
  v_count int := 0;
begin
  if v_gid = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_game_id');
  end if;

  delete from public.nex4up_reviews_live where game_id = v_gid;

  if p_reviews is null or jsonb_typeof(p_reviews) <> 'array' then
    return jsonb_build_object('ok', true, 'gameId', v_gid, 'count', 0);
  end if;

  for v_item in select * from jsonb_array_elements(p_reviews) loop
    v_idx := v_idx + 1;
    v_raw_email := lower(trim(coalesce(v_item->>'email', v_item->>'customerEmail', '')));
    v_cname := left(coalesce(nullif(trim(coalesce(v_item->>'customerName', '')), ''), 'Anonymous'), 120);
    v_rkey := case
      when v_raw_email <> '' then md5('nex4up_rev:' || v_raw_email)
      else md5('nex4up_rev_anon:' || v_gid || ':' || lower(v_cname) || ':' || v_idx::text)
    end;
    v_img := left(trim(coalesce(v_item->>'customerProfileImage', '')), 1000);
    begin
      v_rating := greatest(1.0, least(5.0, round(coalesce(nullif(trim(coalesce(v_item->>'rating', '')), '')::numeric, 5.0), 1)));
    exception when others then
      v_rating := 5.0;
    end;
    v_comment := left(coalesce(v_item->>'comment', ''), 4000);
    v_date_raw := trim(coalesce(v_item->>'createdAt', v_item->>'date', ''));
    v_ts := now();
    if v_date_raw <> '' then
      begin
        v_ts := v_date_raw::timestamptz;
      exception when others then
        v_ts := now();
      end;
    end if;

    insert into public.nex4up_reviews_live (
      game_id, reviewer_key, customer_name, customer_profile_image, rating, comment, created_at
    )
    values (
      v_gid, v_rkey, v_cname, v_img, v_rating, v_comment, v_ts
    )
    on conflict (game_id, reviewer_key) do update
    set customer_name = excluded.customer_name,
        customer_profile_image = excluded.customer_profile_image,
        rating = excluded.rating,
        comment = excluded.comment,
        created_at = greatest(public.nex4up_reviews_live.created_at, excluded.created_at);

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('ok', true, 'gameId', v_gid, 'count', v_count);
end;
$$;

create or replace function public.nex4up_s5_service_upsert_single_review(
  p_game_id text,
  p_email text,
  p_customer_name text,
  p_profile_image text,
  p_rating numeric,
  p_comment text,
  p_created_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gid text := trim(coalesce(p_game_id, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_rkey text;
  v_cname text := left(coalesce(nullif(trim(coalesce(p_customer_name, '')), ''), 'Anonymous'), 120);
  v_img text := left(trim(coalesce(p_profile_image, '')), 1000);
  v_rating numeric(3,1) := greatest(1.0, least(5.0, round(coalesce(p_rating, 5.0), 1)));
  v_comment text := left(coalesce(p_comment, ''), 4000);
  v_ts timestamptz := coalesce(p_created_at, now());
begin
  if v_gid = '' or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_args');
  end if;

  v_rkey := md5('nex4up_rev:' || v_email);

  insert into public.nex4up_reviews_live (
    game_id, reviewer_key, customer_name, customer_profile_image, rating, comment, created_at
  )
  values (
    v_gid, v_rkey, v_cname, v_img, v_rating, v_comment, v_ts
  )
  on conflict (game_id, reviewer_key) do update
  set customer_name = excluded.customer_name,
      customer_profile_image = excluded.customer_profile_image,
      rating = excluded.rating,
      comment = excluded.comment,
      created_at = excluded.created_at;

  return jsonb_build_object('ok', true, 'gameId', v_gid);
end;
$$;

create or replace function public.nex4up_s5_service_invalidate_admin_cache(
  p_cache_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := trim(coalesce(p_cache_key, ''));
  v_deleted int := 0;
begin
  if v_key = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_key');
  end if;

  if right(v_key, 1) = '%' then
    delete from public.nex4up_admin_cache where cache_key like v_key;
  else
    delete from public.nex4up_admin_cache where cache_key = v_key;
  end if;

  get diagnostics v_deleted = row_count;
  return jsonb_build_object('ok', true, 'deleted', v_deleted, 'cacheKey', v_key);
end;
$$;

-- 9. Strict Function Permissions
revoke all on function public.nex4up_s5_get_reviews(text, int) from public;
revoke all on function public.nex4up_s5_get_customer_state(text, text) from public;
revoke all on function public.nex4up_s5_toggle_wishlist_fast(text, text, text) from public;
revoke all on function public.nex4up_s5_get_my_review(text, text, text) from public;

grant execute on function public.nex4up_s5_get_reviews(text, int) to anon, authenticated, service_role;
grant execute on function public.nex4up_s5_get_customer_state(text, text) to anon, authenticated, service_role;
grant execute on function public.nex4up_s5_toggle_wishlist_fast(text, text, text) to anon, authenticated, service_role;
grant execute on function public.nex4up_s5_get_my_review(text, text, text) to anon, authenticated, service_role;

revoke all on function public.nex4up_s5_service_upsert_customer_state(text, jsonb) from public, anon, authenticated;
revoke all on function public.nex4up_s5_service_replace_game_reviews(text, jsonb) from public, anon, authenticated;
revoke all on function public.nex4up_s5_service_upsert_single_review(text, text, text, text, numeric, text, timestamptz) from public, anon, authenticated;
revoke all on function public.nex4up_s5_service_invalidate_admin_cache(text) from public, anon, authenticated;

grant execute on function public.nex4up_s5_service_upsert_customer_state(text, jsonb) to service_role;
grant execute on function public.nex4up_s5_service_replace_game_reviews(text, jsonb) to service_role;
grant execute on function public.nex4up_s5_service_upsert_single_review(text, text, text, text, numeric, text, timestamptz) to service_role;
grant execute on function public.nex4up_s5_service_invalidate_admin_cache(text) to service_role;

notify pgrst, 'reload schema';
