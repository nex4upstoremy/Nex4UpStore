-- =====================================================================
-- NEX4UP Stage 3: Instant Community & Rankings, Fast Likes/Comments/Follows
-- + Privacy Hardening on nex4up_profiles
-- =====================================================================

-- 1. Expand read-only public cache policy to also allow 'community_public_v1'
drop policy if exists "Public read storefront cache" on public.nex4up_storefront_cache;
create policy "Public read storefront cache"
  on public.nex4up_storefront_cache
  for select
  to anon, authenticated
  using (cache_key in ('store_bootstrap_v1', 'community_public_v1'));

-- 2. Harden public.nex4up_profiles (block direct anon reads that exposed customer emails)
do $$
declare
  pol record;
begin
  if to_regclass('public.nex4up_profiles') is not null then
    execute 'alter table public.nex4up_profiles enable row level security';
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = 'nex4up_profiles'
    loop
      execute format('drop policy if exists %I on public.nex4up_profiles', pol.policyname);
    end loop;
    execute 'revoke all on public.nex4up_profiles from anon, authenticated';
  end if;
end $$;

-- 3. Private per-customer social state (strict RLS — NO direct anon/authenticated access)
create table if not exists public.nex4up_social_state (
  customer_email text primary key,
  liked_post_ids jsonb not null default '[]'::jsonb,
  following_emails jsonb not null default '[]'::jsonb,
  blocked_emails jsonb not null default '[]'::jsonb,
  privacy jsonb not null default '{"privacyMode":"public","showSocialHandles":true}'::jsonb,
  profile_snapshot jsonb not null default '{}'::jsonb,
  submissions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.nex4up_social_state enable row level security;
revoke all on public.nex4up_social_state from anon, authenticated;

-- 4. Safe Public RPC: Read sanitized public gamer profiles (ZERO raw emails exposed)
create or replace function public.nex4up_s3_public_profiles(
  p_limit int default 60
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lim int := greatest(1, least(coalesce(p_limit, 60), 100));
  v_rows jsonb := '[]'::jsonb;
begin
  if to_regclass('public.nex4up_profiles') is null then
    return jsonb_build_object('ok', true, 'profiles', '[]'::jsonb);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'displayName', p.display_name,
        'robloxUsername', p.roblox_username,
        'robloxAvatarUrl', p.roblox_avatar_url,
        'avatarUrl', p.custom_avatar_url,
        'avatarMode', p.avatar_mode,
        'bio', p.bio,
        'favoriteGames', p.favorite_games,
        'playstyle', p.playstyle,
        'equippedFrameId', p.equipped_frame_id,
        'badges', p.badges,
        'pointsBalance', p.points_balance_snapshot
      )
      order by p.points_balance_snapshot desc nulls last, p.updated_at desc
    ),
    '[]'::jsonb
  )
  into v_rows
  from (
    select display_name, roblox_username, roblox_avatar_url, custom_avatar_url, avatar_mode,
           bio, favorite_games, playstyle, equipped_frame_id, badges, points_balance_snapshot, updated_at
    from public.nex4up_profiles
    where coalesce(public_profile, true) = true
    order by points_balance_snapshot desc nulls last, updated_at desc
    limit v_lim
  ) p;

  return jsonb_build_object('ok', true, 'profiles', v_rows);
end;
$$;

-- 5. Customer RPC: Fetch verified private social state (likes, follows, blocks, privacy, submissions)
create or replace function public.nex4up_s3_get_my_social_state(
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
  v_row public.nex4up_social_state%rowtype;
begin
  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token and is_registered = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select * into v_row from public.nex4up_social_state where customer_email = v_email;
  if v_row.customer_email is null then
    return jsonb_build_object('ok', true, 'found', false);
  end if;

  return jsonb_build_object(
    'ok', true,
    'found', true,
    'myData', jsonb_build_object(
      'profile', v_row.profile_snapshot,
      'authenticated', true,
      'likedPostIds', v_row.liked_post_ids,
      'followingEmails', v_row.following_emails,
      'blockedEmails', v_row.blocked_emails,
      'privacy', v_row.privacy,
      'submissions', v_row.submissions
    )
  );
end;
$$;

-- 6. Customer RPC: Atomic fast post like toggle (~100 ms)
create or replace function public.nex4up_s3_toggle_like_fast(
  p_email text,
  p_stream_token text,
  p_post_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_stream_token, ''));
  v_pid text := trim(coalesce(p_post_id, ''));
  v_arr jsonb := '[]'::jsonb;
  v_new_arr jsonb := '[]'::jsonb;
  v_liked boolean := false;
  v_delta int := 0;
  v_payload jsonb;
  v_updated_posts jsonb;
  v_new_count int := null;
begin
  if v_pid = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_post_id');
  end if;

  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token and is_registered = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  insert into public.nex4up_social_state (customer_email)
  values (v_email)
  on conflict (customer_email) do nothing;

  select liked_post_ids into v_arr
  from public.nex4up_social_state
  where customer_email = v_email
  for update;

  v_arr := coalesce(v_arr, '[]'::jsonb);

  if exists (select 1 from jsonb_array_elements_text(v_arr) as x(val) where x.val = v_pid) then
    select coalesce(jsonb_agg(to_jsonb(x.val)), '[]'::jsonb) into v_new_arr
    from jsonb_array_elements_text(v_arr) as x(val)
    where x.val <> v_pid;
    v_liked := false;
    v_delta := -1;
  else
    v_new_arr := v_arr || to_jsonb(v_pid);
    v_liked := true;
    v_delta := 1;
  end if;

  update public.nex4up_social_state
  set liked_post_ids = v_new_arr,
      updated_at = now()
  where customer_email = v_email;

  select payload into v_payload
  from public.nex4up_storefront_cache
  where cache_key = 'community_public_v1'
  for update;

  if v_payload is not null and jsonb_typeof(v_payload->'posts') = 'array' then
    select coalesce(jsonb_agg(
      case
        when elem->>'postId' = v_pid then
          jsonb_set(elem, '{likesCount}', to_jsonb(greatest(0, coalesce((elem->>'likesCount')::int, 0) + v_delta)))
        else elem
      end
    ), '[]'::jsonb)
    into v_updated_posts
    from jsonb_array_elements(v_payload->'posts') as elem;

    select (elem->>'likesCount')::int into v_new_count
    from jsonb_array_elements(v_updated_posts) as elem
    where elem->>'postId' = v_pid
    limit 1;

    update public.nex4up_storefront_cache
    set payload = jsonb_set(v_payload, '{posts}', v_updated_posts),
        updated_at = now()
    where cache_key = 'community_public_v1';
  end if;

  return jsonb_build_object(
    'ok', true,
    'postId', v_pid,
    'liked', v_liked,
    'likesCount', v_new_count,
    'likedPostIds', v_new_arr
  );
end;
$$;

-- 7. Customer RPC: Atomic fast player follow toggle (~100 ms)
create or replace function public.nex4up_s3_toggle_follow_fast(
  p_email text,
  p_stream_token text,
  p_target_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_stream_token, ''));
  v_target text := lower(trim(coalesce(p_target_email, '')));
  v_arr jsonb := '[]'::jsonb;
  v_new_arr jsonb := '[]'::jsonb;
  v_following boolean := false;
begin
  if v_target = '' or v_target = v_email then
    return jsonb_build_object('ok', false, 'error', 'invalid_target');
  end if;

  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token and is_registered = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  insert into public.nex4up_social_state (customer_email)
  values (v_email)
  on conflict (customer_email) do nothing;

  select following_emails into v_arr
  from public.nex4up_social_state
  where customer_email = v_email
  for update;

  v_arr := coalesce(v_arr, '[]'::jsonb);

  if exists (select 1 from jsonb_array_elements_text(v_arr) as x(val) where x.val = v_target) then
    select coalesce(jsonb_agg(to_jsonb(x.val)), '[]'::jsonb) into v_new_arr
    from jsonb_array_elements_text(v_arr) as x(val)
    where x.val <> v_target;
    v_following := false;
  else
    v_new_arr := v_arr || to_jsonb(v_target);
    v_following := true;
  end if;

  update public.nex4up_social_state
  set following_emails = v_new_arr,
      updated_at = now()
  where customer_email = v_email;

  return jsonb_build_object(
    'ok', true,
    'targetEmail', v_target,
    'following', v_following,
    'followingEmails', v_new_arr
  );
end;
$$;

-- 8. Customer RPC: Atomic fast comment append (~100 ms)
create or replace function public.nex4up_s3_add_comment_fast(
  p_email text,
  p_stream_token text,
  p_post_id text,
  p_content text,
  p_author_name text default '',
  p_avatar_url text default '',
  p_frame_id text default 'frame_default'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := trim(coalesce(p_stream_token, ''));
  v_pid text := trim(coalesce(p_post_id, ''));
  v_content text := left(trim(coalesce(p_content, '')), 600);
  v_author text := left(coalesce(nullif(trim(coalesce(p_author_name, '')), ''), split_part(v_email, '@', 1)), 80);
  v_avatar text := left(trim(coalesce(p_avatar_url, '')), 500);
  v_frame text := left(coalesce(nullif(trim(coalesce(p_frame_id, '')), ''), 'frame_default'), 60);
  v_comment jsonb;
  v_payload jsonb;
  v_updated_posts jsonb;
  v_new_count int := null;
begin
  if v_pid = '' or v_content = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_input');
  end if;

  if not exists (
    select 1 from public.nex4up_chat_threads
    where email = v_email and chat_token = v_token and is_registered = true
  ) then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  v_comment := jsonb_build_object(
    'authorEmail', v_email,
    'authorName', v_author,
    'avatarUrl', v_avatar,
    'equippedFrameId', v_frame,
    'content', v_content,
    'createdAt', to_char(now() at time zone 'Asia/Kuala_Lumpur', 'YYYY-MM-DD HH24:MI')
  );

  select payload into v_payload
  from public.nex4up_storefront_cache
  where cache_key = 'community_public_v1'
  for update;

  if v_payload is not null and jsonb_typeof(v_payload->'posts') = 'array' then
    select coalesce(jsonb_agg(
      case
        when elem->>'postId' = v_pid then
          jsonb_set(
            jsonb_set(elem, '{comments}', coalesce(elem->'comments', '[]'::jsonb) || jsonb_build_array(v_comment)),
            '{commentsCount}',
            to_jsonb(coalesce((elem->>'commentsCount')::int, 0) + 1)
          )
        else elem
      end
    ), '[]'::jsonb)
    into v_updated_posts
    from jsonb_array_elements(v_payload->'posts') as elem;

    select (elem->>'commentsCount')::int into v_new_count
    from jsonb_array_elements(v_updated_posts) as elem
    where elem->>'postId' = v_pid
    limit 1;

    update public.nex4up_storefront_cache
    set payload = jsonb_set(v_payload, '{posts}', v_updated_posts),
        updated_at = now()
    where cache_key = 'community_public_v1';
  end if;

  return jsonb_build_object(
    'ok', true,
    'postId', v_pid,
    'comment', v_comment,
    'commentsCount', v_new_count
  );
end;
$$;

-- 9. Backend-Only (service_role / GAS) RPC: Upsert Customer Social State Snapshot
create or replace function public.nex4up_s3_service_upsert_social_state(
  p_email text,
  p_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text;
begin
  if v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  insert into public.nex4up_chat_threads (email, customer_name, is_registered)
  values (v_email, left(coalesce(p_state->'profile'->>'name', ''), 120), true)
  on conflict (email) do update
  set is_registered = true,
      updated_at = now()
  returning chat_token into v_token;

  insert into public.nex4up_social_state (
    customer_email, liked_post_ids, following_emails, blocked_emails,
    privacy, profile_snapshot, submissions, updated_at
  )
  values (
    v_email,
    coalesce(p_state->'likedPostIds', '[]'::jsonb),
    coalesce(p_state->'followingEmails', '[]'::jsonb),
    coalesce(p_state->'blockedEmails', '[]'::jsonb),
    coalesce(p_state->'privacy', '{"privacyMode":"public","showSocialHandles":true}'::jsonb),
    coalesce(p_state->'profile', '{}'::jsonb),
    coalesce(p_state->'submissions', '[]'::jsonb),
    now()
  )
  on conflict (customer_email) do update
  set liked_post_ids = excluded.liked_post_ids,
      following_emails = excluded.following_emails,
      blocked_emails = excluded.blocked_emails,
      privacy = excluded.privacy,
      profile_snapshot = excluded.profile_snapshot,
      submissions = excluded.submissions,
      updated_at = now();

  return jsonb_build_object('ok', true, 'chat_token', v_token);
end;
$$;

-- 10. Strict Function Permissions
revoke all on function public.nex4up_s3_public_profiles(int) from public;
revoke all on function public.nex4up_s3_get_my_social_state(text, text) from public;
revoke all on function public.nex4up_s3_toggle_like_fast(text, text, text) from public;
revoke all on function public.nex4up_s3_toggle_follow_fast(text, text, text) from public;
revoke all on function public.nex4up_s3_add_comment_fast(text, text, text, text, text, text, text) from public;

grant execute on function public.nex4up_s3_public_profiles(int) to anon, authenticated, service_role;
grant execute on function public.nex4up_s3_get_my_social_state(text, text) to anon, authenticated, service_role;
grant execute on function public.nex4up_s3_toggle_like_fast(text, text, text) to anon, authenticated, service_role;
grant execute on function public.nex4up_s3_toggle_follow_fast(text, text, text) to anon, authenticated, service_role;
grant execute on function public.nex4up_s3_add_comment_fast(text, text, text, text, text, text, text) to anon, authenticated, service_role;

revoke all on function public.nex4up_s3_service_upsert_social_state(text, jsonb) from public, anon, authenticated;
grant execute on function public.nex4up_s3_service_upsert_social_state(text, jsonb) to service_role;

notify pgrst, 'reload schema';
