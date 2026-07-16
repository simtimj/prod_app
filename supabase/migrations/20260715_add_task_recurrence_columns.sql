alter table public.tasks
  add column if not exists recurrence_enabled boolean not null default false,
  add column if not exists recurrence_frequency text,
  add column if not exists recurrence_weekdays integer[],
  add column if not exists recurrence_month_days integer[];

alter table public.tasks
  drop constraint if exists tasks_recurrence_frequency_check;

alter table public.tasks
  add constraint tasks_recurrence_frequency_check
  check (recurrence_frequency in ('daily', 'weekly', 'monthly') or recurrence_frequency is null);

update public.tasks
set
  recurrence_enabled = coalesce(recurrence_enabled, false),
  recurrence_frequency = case
    when recurrence_enabled and recurrence_frequency is null then 'daily'
    else recurrence_frequency
  end,
  recurrence_weekdays = case
    when recurrence_enabled and recurrence_frequency = 'weekly' and (recurrence_weekdays is null or cardinality(recurrence_weekdays) = 0)
      then array[1]
    else recurrence_weekdays
  end,
  recurrence_month_days = case
    when recurrence_enabled and recurrence_frequency = 'monthly' and (recurrence_month_days is null or cardinality(recurrence_month_days) = 0)
      then array[1]
    else recurrence_month_days
  end;
