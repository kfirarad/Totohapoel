import type { Column } from '@/core/types';
import { isPast } from '@/lib/dates';

/** Column to show by default: the open one closing soonest, else the latest. */
export const defaultColumn = (cols: Column[]) => {
  const open = cols.filter((c) => !isPast(c.deadline)).sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));
  return open[0] ?? cols[0];
};
