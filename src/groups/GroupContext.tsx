import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyGroups } from "./api";
import i18n, { resolveLanguage, setLanguage } from "@/i18n";
import { getMarket } from "@/markets/registry";
import { GroupContext } from "./useGroup";

const CURRENT_GROUP = "currentGroup";
const readStored = () => {
  try { return localStorage.getItem(CURRENT_GROUP); } catch { return null; }
};

const groupsQueryKey = (userId?: string) => ["myGroups", userId] as const;

export const GroupProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(readStored);

  const { data: groups = [], isLoading, refetch } = useQuery({
    queryKey: groupsQueryKey(user?.id),
    queryFn: () => fetchMyGroups(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // the stored choice if I'm still in that group, else the first one
  const group = groups.find((g) => g.id === selectedId) ?? groups[0] ?? null;

  // show the language the user picked, else the group's, else its market's
  useEffect(() => {
    if (!profile) return;
    const lng = resolveLanguage({
      profile: profile.locale,
      group: group?.locale,
      market: group ? getMarket(group.market).defaultLocale : null,
    });
    if (lng !== i18n.language) setLanguage(lng);
  }, [profile, group]);

  const selectGroup = useCallback(
    (id: string) => {
      setSelectedId(id);
      try { localStorage.setItem(CURRENT_GROUP, id); } catch { /* storage unavailable */ }
      // everything on screen is per group
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== "myGroups" });
    },
    [queryClient]
  );

  const value = useMemo(
    () => ({
      groups,
      group,
      isLoading: !!user && isLoading,
      isGroupAdmin: group?.role === "admin",
      selectGroup,
      refreshGroups: refetch,
    }),
    [groups, group, user, isLoading, selectGroup, refetch]
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
};
