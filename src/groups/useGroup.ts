import { createContext, useContext } from "react";
import type { MyGroup } from "./api";

type GroupContextValue = {
  groups: MyGroup[];
  /** the group the app is showing; null while loading or when I'm in no group */
  group: MyGroup | null;
  isLoading: boolean;
  isGroupAdmin: boolean;
  selectGroup: (id: string) => void;
  refreshGroups: () => Promise<unknown>;
};

export const GroupContext = createContext<GroupContextValue | undefined>(undefined);

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
