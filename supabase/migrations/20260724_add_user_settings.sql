create table if not exists public.user_settings (
  user_id uuid not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_settings_pkey primary key (user_id),
  constraint user_settings_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);