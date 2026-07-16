alter table public.tasks
  add column if not exists due_time text;

alter table public.tasks
  drop constraint if exists tasks_due_time_check;

alter table public.tasks
  add constraint tasks_due_time_check
  check (due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or due_time is null);
