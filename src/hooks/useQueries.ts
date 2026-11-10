import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { BetResult, Column, Game } from "@/types/database.types";
import { User } from "@supabase/supabase-js";
import { useGroup } from "@/groups/useGroup";
import type { MyGroup } from "@/groups/api";
import { toGroupColumn, type GroupColumnRow } from "@/groups/groupColumn";

type VoteCounts = { total: number; "1": number; X: number; "2": number };
export interface VoteStats {
  weighted: VoteCounts;
  classic: VoteCounts;
  doubles: number;
  triples: number;
  singles: number;
  totalColumns: number;
}
import type { SeasonBet, SeasonColumn } from "@/lib/stats";

// Query keys
// Everything players see is per group, so every key starts with the group id
export const queryKeys = {
  columns: ["columns"] as const,
  column: (groupId: string, id?: string) => ["column", groupId, id] as const,
  user_bets: (groupId: string, columnId: string, userId: string) =>
    ["user_bets", groupId, columnId, userId] as const,
  voteStats: (groupId: string, columnId: string) => ["voteStats", groupId, columnId] as const,
  columnStats: (groupId: string, columnId: string) => ["columnStats", groupId, columnId] as const,
  seasonData: (groupId: string) => ["seasonData", groupId] as const,
};

const betValue = {
    single: 1,
    double: 0.5,
    triple: 0.33,
}

// Fetch functions
// A column as this group sees it: operator draw + the group's limits, active/archived and group bet
const GROUP_COLUMN = "*, group_columns!inner(*)";

const fetchColumn = async (group: MyGroup, id?: string) => {
  const base = supabase.from("columns").select(GROUP_COLUMN).eq("group_columns.group_id", group.id);
  const { data, error } = await (id
    ? base.eq("id", id).single()
    : base
        .eq("group_columns.is_active", true)
        .eq("group_columns.is_archived", false)
        .order("deadline", { ascending: false })
        .limit(1)
        .single());
  if (error) throw error;
  const currentColumn = toGroupColumn(data as GroupColumnRow, group);

  // previous/next column ids in this group (only ids are used for navigation)
  const neighbours = () =>
    supabase
      .from("columns")
      .select("id, group_columns!inner(group_id)")
      .eq("group_columns.group_id", group.id)
      .eq("group_columns.is_archived", false);
  const [{ data: previousColumn }, { data: nextColumn }] = await Promise.all([
    neighbours().lt("deadline", currentColumn.deadline).order("deadline", { ascending: false }).limit(1).maybeSingle(),
    neighbours().gt("deadline", currentColumn.deadline).order("deadline", { ascending: true }).limit(1).maybeSingle(),
  ]);

  return {
    ...currentColumn,
    previousColumn: previousColumn ? { id: previousColumn.id as string } : null,
    nextColumn: nextColumn ? { id: nextColumn.id as string } : null,
  };
};

const fetchUserBets = async (groupId: string, columnId: string, user_id: string) => {
  const { data, error } = await supabase
    .from("user_bets")
    .select(
      `*,
            profiles(id, name, avatar_url)`
    )
    .eq("group_id", groupId)
    .eq("column_id", columnId)
    .eq("user_id", user_id)
    // one bet per group+column+user; null (not an error) when there is no bet yet
    .maybeSingle();
  if (error) throw error;
  return data;
};

type GameBetValue = {
  game_num: Game["game_num"];
  value: BetResult[];
};

type UserBets = {
  user_id: User["id"];
  column_id: Column["id"];
  bet_values: GameBetValue[];
};

type GamesVotesStats = Record<string, VoteStats>;

const fetchVoteStats = async (groupId: string, columnId: string) => {
  const { data: column, error: gamesError } = await supabase
    .from("columns")
    .select("games")
    .eq("id", columnId)
    .returns<Column[]>()
    .single();

  if (gamesError) throw gamesError;

  const { games = [] } = column;

  const gameVotes: GamesVotesStats = games.reduce((acc, game) => {
    acc[game.game_num] = {
      weighted: {
        total: 0,
        "1": 0,
        X: 0,
        "2": 0,
      },
      classic: {
        "1": 0,
        X: 0,
        "2": 0,
        total: 0,
      },
      singles: 0,
      doubles: 0,
      triples: 0,
      totalColumns: 0,
    };
    return acc;
  }, {} as GamesVotesStats);

  const { data: userBets, error } = await supabase
    .from("user_bets")
    .select("*")
    .eq("group_id", groupId)
    .eq("column_id", columnId)
    .returns<UserBets[]>();

  if (error) throw error;

  const ab = userBets.reduce((acc, userBet) => {
    userBet.bet_values.forEach((gameBet) => {
        let betType: "single" | "double" | "triple" = "single";
        if (gameBet.value.length === 1) {
            acc[gameBet.game_num].singles++;
            betType = "single";
          } else if (gameBet.value.length === 2) {
            acc[gameBet.game_num].doubles++;
            betType = "double";
          } else if (gameBet.value.length === 3) {
            acc[gameBet.game_num].triples++;
            betType = "triple";
          }


      gameBet.value.forEach((bet) => {
        if (bet === "1" || bet === "X" || bet === "2") {
          acc[gameBet.game_num]['classic'][bet]++;
          acc[gameBet.game_num]['weighted'][bet] += betValue[betType];
        }
      });

      acc[gameBet.game_num]['classic'].total += gameBet.value.length;
      acc[gameBet.game_num]['weighted'].total += 1;

      acc[gameBet.game_num].totalColumns++;
    });

    return acc;
  }, gameVotes);
  
  return ab;
};

const fetchColumnStats = async (groupId: string, column: Column) => {
  const { games } = column;
  const { data: bets, error: betsError } = await supabase
    .from(`user_bets`)
    .select(
      `
            bet_values,
            profiles(id, name, avatar_url),
            user_id
            `
    )
    .eq("group_id", groupId)
    .eq("column_id", column.id)
    .returns<UserBets[]>();

  if (betsError) throw betsError;

  // Calculate stats for each user
  const userStats = bets.reduce(
    (acc, bet) => {
      const {
        profiles: { id: userId, name, avatar_url },
        bet_values: betValues,
      } = bet;

      if (!acc[userId]) {
        acc[userId] = {
          user: {
            id: userId,
            name: name,
            avatar_url,
          },
          totalBets: 0,
          correctBets: 0,
          picks: {},
        };
      }
      betValues.forEach((gameBet) => {
        acc[userId].picks[gameBet.game_num] = gameBet.value;
        const game = games?.find((game) => game.game_num == gameBet.game_num);
        if (game && game.result && gameBet.value.includes(game.result)) {
          acc[userId].correctBets++;
        }
        acc[userId].totalBets++;
      });

      return acc;
    },
    {} as Record<
      string,
      {
        user: { id: string; name: string; avatar_url: string | null };
        totalBets: number;
        correctBets: number;
        picks: Record<string, BetResult[]>;
      }
    >
  );
  return Object.values(userStats).sort((a, b) => b.correctBets - a.correctBets);
};

// Query Hooks
// Shared options so pages can prefetch exactly what the hooks will read
export const columnQueryOptions = (group: MyGroup, id?: string) =>
  queryOptions({
    // the group's limits are part of the result, so a change to them refetches
    queryKey: [...queryKeys.column(group.id, id), group.max_doubles, group.max_triples],
    queryFn: () => fetchColumn(group, id),
  });

export const userBetsQueryOptions = (groupId: string, columnId: string, userId: string) =>
  queryOptions({
    queryKey: queryKeys.user_bets(groupId, columnId, userId),
    queryFn: () => fetchUserBets(groupId, columnId, userId),
    enabled: !!groupId && !!columnId && !!userId,
  });

const useGroupId = () => useGroup().group?.id ?? "";

export const useColumnQuery = (id?: string) => {
  const { group } = useGroup();
  return useQuery({
    ...columnQueryOptions(group!, id),
    enabled: !!group,
    // keep showing the current column while the next one loads
    placeholderData: keepPreviousData,
  });
};

export const useUserBetsQuery = (columnId: string, userId: string) => {
  return useQuery(userBetsQueryOptions(useGroupId(), columnId, userId));
};

export const useVoteStatsQuery = (columnId: string) => {
  const groupId = useGroupId();
  return useQuery({
    queryKey: queryKeys.voteStats(groupId, columnId),
    queryFn: () => fetchVoteStats(groupId, columnId),
    enabled: !!groupId && !!columnId,
  });
};

export const useColumnStatsQuery = (column: Column | undefined) => {
  const groupId = useGroupId();
  return useQuery({
    queryKey: queryKeys.columnStats(groupId, column?.id || ""),
    queryFn: () => fetchColumnStats(groupId, column!),
    enabled: !!groupId && !!column?.id,
  });
};

// Mutation Hooks
export const usePlaceBetMutation = () => {
  const queryClient = useQueryClient();
  const groupId = useGroupId();

  return useMutation({
    mutationFn: async ({
      betValues,
      userId,
      columnId,
    }: {
      betValues: {
        game_num: string;
        value: BetResult[];
      }[];
      userId: string;
      columnId: string;
    }) => {
      // Match by group+user+column instead of a cached row id, so a stale/failed fetch can't cause a duplicate insert.
      // .select() makes a silent 0-row update (e.g. RLS) detectable. The database checks deadline and limits.
      const { data: updated, error: updateError } = await supabase
        .from("user_bets")
        .update({ bet_values: betValues })
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .eq("column_id", columnId)
        .select("id");
      if (updateError) throw updateError;
      if (updated?.length) return true;

      const { data: inserted, error: insertError } = await supabase
        .from("user_bets")
        .insert([
          { bet_values: betValues, user_id: userId, column_id: columnId, group_id: groupId },
        ])
        .select("id");
      if (insertError) throw insertError;
      if (!inserted?.length) throw new Error("bet not saved");
      return true;
    },
    onSuccess: (_, { columnId, userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.voteStats(groupId, columnId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.columnStats(groupId, columnId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user_bets(groupId, columnId, userId),
      });
    },
  });
};

// PostgREST caps responses (1000 rows by default), so page through everything
const fetchAllRows = async <T,>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
) => {
  const PAGE = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
};

type SeasonColumnRow = Omit<SeasonColumn, "group_bet"> & { group_columns: { group_bet: SeasonColumn["group_bet"] }[] };

/** All of this group's columns and bets, for season stats and the form-weighted algo */
export const useSeasonDataQuery = (enabled = true) => {
  const groupId = useGroupId();
  return useQuery({
    queryKey: queryKeys.seasonData(groupId),
    enabled: enabled && !!groupId,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const [rows, bets] = await Promise.all([
        fetchAllRows<SeasonColumnRow>((from, to) =>
          supabase
            .from("columns")
            .select("id, name, deadline, games, group_columns!inner(group_bet)")
            .eq("group_columns.group_id", groupId)
            .eq("group_columns.is_archived", false)
            .order("deadline")
            .range(from, to)
            .returns<SeasonColumnRow[]>()
        ),
        fetchAllRows<SeasonBet>((from, to) =>
          supabase
            .from("user_bets")
            .select("user_id, column_id, bet_values, profiles(name, avatar_url)")
            .eq("group_id", groupId)
            .order("id")
            .range(from, to)
            .returns<SeasonBet[]>()
        ),
      ]);
      // the group bet lives on the group's view of the column
      const columns: SeasonColumn[] = rows.map(({ group_columns, ...c }) => ({
        ...c,
        group_bet: group_columns[0]?.group_bet ?? null,
      }));
      return { columns, bets };
    },
  });
};
