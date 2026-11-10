-- Archived columns are hidden from players: navigation, the default column and season stats.
alter table public.columns
  add column if not exists is_archived boolean not null default false;

create index if not exists columns_is_archived_deadline_idx
  on public.columns (is_archived, deadline desc);
