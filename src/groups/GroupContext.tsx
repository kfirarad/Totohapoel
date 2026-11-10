import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyGroups, type MyGroup } from "./api";

type GroupContextValue = {
  groups: MyGroup[];
  /** the group the app is showing; null while loading or when I'm in no group */
  group: MyGroup | null;
  isLoading: boolean;
  isGroupAdmin: boolean;
  selectGroup: (id: string) => void;
  refreshGroups: () => Promise<unknown>;
};

const GroupContext = createContext<GroupContextValue | undefined>(undefined);

const CURRENT_GROUP = "currentGroup";
const readStored = () => {
  try { return localStorage.getItem(CURRENT_GROUP); } catch { return null; }
};

export const groupsQueryKey = (userId?: string) => ["myGroups", userId] as const;

export const GroupProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
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

export const useGroup = () => {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error("useGroup must be used within a GroupProvider");
  return ctx;
};

/** The current group, for pages that only render once a group exists */
export const useCurrentGroup = () => {
  const { group } = useGroup();
  if (!group) throw new Error("no current group");
  return group;
};
