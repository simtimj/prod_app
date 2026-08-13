create index if not exists tasks_user_archived_position_created_idx
  on public.tasks (user_id, archived, position, created_at);

create index if not exists tasks_user_created_idx
  on public.tasks (user_id, created_at);
