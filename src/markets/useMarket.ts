import { useGroup } from "@/groups/useGroup";
import { getMarket } from "./registry";

/** The market the UI is showing: the current group's (the default market before a group is chosen) */
export const useMarket = () => getMarket(useGroup().group?.market);
