-- Reduces per-insert index writes; pg_stat_user_indexes showed 0 scans (due_date, read index) and a prefix duplicate (user_id).
drop index if exists public.tasks_user_id_due_date_idx;
drop index if exists public.idx_tasks_user_archived_position_created_at;
drop index if exists public.tasks_user_id_idx;
