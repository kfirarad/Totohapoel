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
export const queryKeys = {
  columns: ["columns"] as const,
  column: (id?: string) => ["column", id] as const,
  user_bets: (columnId: string, userId: string) =>
    ["user_bets", columnId, userId] as const,
  voteStats: (columnId: string) => ["voteStats", columnId] as const,
  columnStats: (columnId: string) => ["columnStats", columnId] as const,
  seasonData: ["seasonData"] as const,
};

const betValue = {
    single: 1,
    double: 0.5,
    triple: 0.33,
}

// Fetch functions
const fetchColumn = async (id?: string) => {
  let currentColumn;

  if (id) {
    const { data, error } = await supabase
      .from("columns")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    currentColumn = data;
  } else {
    const { data, error } = await supabase
      .from("columns")
      .select("*")
      .eq("is_active", true)
      .order("deadline", { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    currentColumn = data;
  }

  // Fetch previous/next column ids in parallel (only ids are used for navigation)
  const [{ data: previousColumn }, { data: nextColumn }] = await Promise.all([
    supabase
      .from("columns")
      .select("id")
      .lt("deadline", currentColumn.deadline)
      .order("deadline", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("columns")
      .select("id")
      .gt("deadline", currentColumn.deadline)
      .order("deadline", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    ...currentColumn,
    previousColumn,
    nextColumn,
  };
};

const fetchUserBets = async (columnId: string, user_id: string) => {
  const { data, error } = await supabase
    .from("user_bets")
    .select(
      `*,
            profiles(id, name, avatar_url)`
    )
    .eq("column_id", columnId)
    .eq("user_id", user_id)
    // Latest row wins: tolerates legacy duplicate rows and returns null (not an error) when no bet exists yet
    .order("created_at", { ascending: false })
    .limit(1)
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

const fetchVoteStats = async (columnId: string) => {
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
    .eq("column_id", columnId)
    .order("created_at", { ascending: false })
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

const fetchColumnStats = async (column: Column) => {
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
export const columnQueryOptions = (id?: string) =>
  queryOptions({
    queryKey: queryKeys.column(id),
    queryFn: () => fetchColumn(id),
  });

export const userBetsQueryOptions = (columnId: string, userId: string) =>
  queryOptions({
    queryKey: queryKeys.user_bets(columnId, userId),
    queryFn: () => fetchUserBets(columnId, userId),
    enabled: !!columnId && !!userId,
  });

export const useColumnQuery = (id?: string) => {
  return useQuery({
    ...columnQueryOptions(id),
    // keep showing the current column while the next one loads
    placeholderData: keepPreviousData,
  });
};

export const useUserBetsQuery = (columnId: string, userId: string) => {
  return useQuery(userBetsQueryOptions(columnId, userId));
};

export const useVoteStatsQuery = (columnId: string) => {
  return useQuery({
    queryKey: queryKeys.voteStats(columnId),
    queryFn: () => fetchVoteStats(columnId),
    enabled: !!columnId,
  });
};

export const useColumnStatsQuery = (column: Column) => {
  return useQuery({
    queryKey: queryKeys.columnStats(column?.id || ""),
    queryFn: () => fetchColumnStats(column),
    enabled: !!column?.id,
  });
};

// Mutation Hooks
export const usePlaceBetMutation = () => {
  const queryClient = useQueryClient();

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
      // Match by user+column instead of a cached row id, so a stale/failed fetch can't cause a duplicate insert.
      // .select() makes a silent 0-row update (e.g. RLS) detectable.
      const { data: updated, error: updateError } = await supabase
        .from("user_bets")
        .update({ bet_values: betValues })
        .eq("user_id", userId)
        .eq("column_id", columnId)
        .select("id");
      if (updateError) throw updateError;
      if (updated?.length) return true;

      const { data: inserted, error: insertError } = await supabase
        .from("user_bets")
        .insert([
          { bet_values: betValues, user_id: userId, column_id: columnId },
        ])
        .select("id");
      if (insertError) throw insertError;
      if (!inserted?.length) throw new Error("bet not saved");
      return true;
    },
    onSuccess: (_, { columnId, userId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.voteStats(columnId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.columnStats(columnId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.user_bets(columnId, userId),
      });
    },
  });
};

export const useSetResultMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gameId,
      value,
    }: {
      gameId: string;
      value: BetResult;
    }) => {
      const { error } = await supabase
        .from("games")
        .update({ result: value })
        .eq("id", gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.columnStats("") });
      queryClient.invalidateQueries({ queryKey: queryKeys.column("") });
    },
  });
};

export const useRecalculateCorrectGuessesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (columnId?: string) => {
      if (!columnId) return;

      // Get the column data
      const { data: column, error: columnError } = await supabase
        .from("columns")
        .select("*")
        .eq("id", columnId)
        .single();

      if (columnError) throw columnError;

      // Get all user bets for the column
      const { data: userBets, error: userBetsError } = await supabase
        .from("user_bets")
        .select("*")
        .eq("column_id", columnId);

      if (userBetsError) throw userBetsError;

      // Update correct_guess for each user bet
      const toUpdate = await Promise.all(
        userBets.map(async (userBet) => {
          let correctGuesses = 0;
          for (const gameBet of userBet.bet_values) {
            const game = column.games.find(
              (g: Game) => g.game_num == gameBet.game_num
            );
            if (game && game.result && gameBet.value.includes(game.result)) {
              correctGuesses++;
            }
          }
          return { id: userBet.id, correct_guesses: correctGuesses };
        })
      );

      const { error: updateError } = await supabase
        .from("user_bets")
        .upsert(toUpdate);

      if (updateError) throw updateError;

      // now update the column "group_bet_correct_guesses"
      const groupBetCorrectGuesses = column.group_bet?.reduce((acc, gameBet) => {
        const game = column.games.find(
          (g: Game) => g.game_num == gameBet.game_num
        );
        if (game && game.result && gameBet.value.includes(game.result)) {
          acc++;
        }
        return acc;
      }, 0);

      const { error: updateColumnError } = await supabase
        .from("columns")
        .update({ group_bet_correct_guesses: groupBetCorrectGuesses })
        .eq("id", columnId);

      if (updateColumnError) throw updateColumnError;

      return { columnId };
    },
    onSuccess: ({ columnId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.columnStats(columnId),
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

/** All columns and bets, for season stats and the form-weighted algo */
export const useSeasonDataQuery = (enabled = true) => {
  return useQuery({
    queryKey: queryKeys.seasonData,
    enabled,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const [columns, bets] = await Promise.all([
        fetchAllRows<SeasonColumn>((from, to) =>
          supabase
            .from("columns")
            .select("id, name, deadline, games, group_bet")
            .order("deadline")
            .range(from, to)
            .returns<SeasonColumn[]>()
        ),
        fetchAllRows<SeasonBet>((from, to) =>
          supabase
            .from("user_bets")
            .select("user_id, column_id, bet_values, profiles(name, avatar_url)")
            .order("id")
            .range(from, to)
            .returns<SeasonBet[]>()
        ),
      ]);
      return { columns, bets };
    },
  });
};
