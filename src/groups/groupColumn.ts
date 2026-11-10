import type { Column, GroupColumnState, OperatorColumn } from "@/types/database.types";

/** `columns` row selected with `group_columns!inner(*)`, filtered to one group */
export type GroupColumnRow = OperatorColumn & { group_columns: GroupColumnState[] };

type GroupLimits = { max_doubles: number; max_triples: number };

/** min() that treats null/undefined as "no limit" */
const cap = (value: number, max: number | null | undefined) => (max == null ? value : Math.min(value, max));

/**
 * Operator draw + this group's view of it, flattened into the shape the pages use.
 * Mirrors effective_limits() in the database, which is what actually enforces the limits.
 */
export const toGroupColumn = (row: GroupColumnRow, group: GroupLimits): Column => {
  const { group_columns, ...column } = row;
  const gc = group_columns[0];
  return {
    ...column,
    operator_max_doubles: column.max_doubles ?? null,
    operator_max_triples: column.max_triples ?? null,
    max_doubles: cap(gc?.max_doubles ?? group.max_doubles, column.max_doubles),
    max_triples: cap(gc?.max_triples ?? group.max_triples, column.max_triples),
    group_override_doubles: gc?.max_doubles ?? null,
    group_override_triples: gc?.max_triples ?? null,
    is_active: gc?.is_active ?? false,
    is_archived: gc?.is_archived ?? false,
    group_bet: gc?.group_bet ?? null,
    group_max_doubles: gc?.group_bet_max_doubles ?? null,
    group_max_triples: gc?.group_bet_max_triples ?? null,
    group_bet_correct_guesses: gc?.group_bet_correct_guesses ?? null,
  };
};
