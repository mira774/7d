-- CLASS 7D — полная схема. Выполнить целиком в Supabase → SQL Editor ОДИН раз.

create type user_role as enum ('owner', 'moderator', 'student');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  login text not null unique,
  full_name text not null default '',
  role user_role not null default 'student',
  perms text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint perms_valid check (perms <@ array['homework','answer','news','schedule'])
);
-- Владелец может быть только один — это гарантирует сама база.
create unique index profiles_one_owner on profiles (role) where role = 'owner';

create function is_owner() returns boolean language sql security definer stable set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'owner') $$;
create function is_staff() returns boolean language sql security definer stable set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and role in ('owner','moderator')) $$;
create function has_perm(p text) returns boolean language sql security definer stable set search_path = public as
$$ select exists (select 1 from profiles where id = auth.uid() and (role = 'owner' or (role = 'moderator' and p = any (perms)))) $$;

-- Первый созданный пользователь = владелец. Остальные — ученики (роль потом меняет владелец).
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare first_user boolean;
begin
  select not exists (select 1 from profiles) into first_user;
  insert into profiles (id, login, full_name, role)
  values (new.id, lower(coalesce(new.raw_user_meta_data->>'login', new.email)), coalesce(new.raw_user_meta_data->>'full_name', ''),
          case when first_user then 'owner'::user_role else 'student'::user_role end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Клиент не может ни выдать себе права, ни создать второго владельца.
create function protect_profile() returns trigger language plpgsql as $$
begin
  if auth.uid() is null then return new; end if; -- SQL Editor / сервисный ключ
  if not is_owner() then
    new.role := old.role; new.perms := old.perms; new.login := old.login;
  else
    new.login := old.login;
    if old.role = 'owner' then new.role := 'owner'; new.perms := '{}';
    elsif new.role = 'owner' then new.role := old.role; end if;
  end if;
  if new.role = 'student' then new.perms := '{}'; end if;
  return new;
end $$;
create trigger protect_profile_trg before update on profiles for each row execute function protect_profile();

alter table profiles enable row level security;
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_update on profiles for update to authenticated using (id = auth.uid() or is_owner());

-- Записи: задания, ответы, объявления
create table posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('homework','answer','news')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 20000),
  subject text not null default '',
  due_date date,
  pinned boolean not null default false,
  files jsonb not null default '[]',
  author_id uuid references profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index posts_kind_created on posts (kind, created_at desc);
alter table posts enable row level security;
create policy posts_read on posts for select to authenticated using (true);
create policy posts_insert on posts for insert to authenticated with check (has_perm(kind) and author_id = auth.uid());
create policy posts_update on posts for update to authenticated using (has_perm(kind)) with check (has_perm(kind));
create policy posts_delete on posts for delete to authenticated using (has_perm(kind));

create table homework_done (
  user_id uuid not null default auth.uid() references profiles on delete cascade,
  post_id uuid not null references posts on delete cascade,
  primary key (user_id, post_id)
);
alter table homework_done enable row level security;
create policy done_own on homework_done for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table lessons (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 1 and 6),
  lesson_no smallint not null check (lesson_no between 1 and 10),
  subject text not null check (char_length(subject) between 1 and 100),
  start_time time not null,
  end_time time not null,
  room text not null default '',
  note text not null default ''
);
alter table lessons enable row level security;
create policy lessons_read on lessons for select to authenticated using (true);
create policy lessons_write on lessons for all to authenticated using (has_perm('schedule')) with check (has_perm('schedule'));

-- Общий чат класса
create table messages (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_created on messages (created_at desc);
alter table messages enable row level security;
create policy msg_read on messages for select to authenticated using (true);
create policy msg_insert on messages for insert to authenticated with check (author_id = auth.uid());
create policy msg_delete on messages for delete to authenticated using (author_id = auth.uid() or is_owner());

-- Файлы (приватный бакет, выдача по временным ссылкам)
insert into storage.buckets (id, name, public, file_size_limit) values ('files', 'files', false, 26214400) on conflict (id) do nothing;
create policy files_read on storage.objects for select to authenticated using (bucket_id = 'files');
create policy files_insert on storage.objects for insert to authenticated with check (bucket_id = 'files' and is_staff());
create policy files_delete on storage.objects for delete to authenticated using (bucket_id = 'files' and is_staff());

alter publication supabase_realtime add table posts, lessons, profiles, messages;
