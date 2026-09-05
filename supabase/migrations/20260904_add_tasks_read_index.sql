-- Supports /tasks reads filtering by user and ordering by archived/position/created_at.
create index if not exists idx_tasks_user_archived_position_created_at
  on public.tasks (user_id, archived, position, created_at);