create table if not exists public.saved_lists (
  id text not null,
  user_id uuid not null,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint saved_lists_pkey primary key (user_id, id),
  constraint saved_lists_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
);

create index if not exists saved_lists_user_position_idx
  on public.saved_lists (user_id, position, created_at);

create table if not exists public.saved_list_tasks (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  list_id text not null,
  title text not null,
  completed boolean not null default false,
  recurrence_enabled boolean not null default false,
  recurrence_frequency text null,
  recurrence_weekdays integer[] null,
  recurrence_month_days integer[] null,
  tag text null,
  tag_color text null,
  description text null,
  due_date text null,
  due_time text null,
  priority text null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint saved_list_tasks_pkey primary key (id),
  constraint saved_list_tasks_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint saved_list_tasks_list_fkey foreign key (user_id, list_id) references public.saved_lists (user_id, id) on delete cascade,
  constraint saved_list_tasks_recurrence_frequency_check check (
    recurrence_frequency is null or recurrence_frequency in ('daily', 'weekly', 'monthly')
  ),
  constraint saved_list_tasks_priority_check check (
    priority is null or priority in ('Low', 'Medium', 'High')
  )
);

create index if not exists saved_list_tasks_user_list_position_idx
  on public.saved_list_tasks (user_id, list_id, position, created_at);