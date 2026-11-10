import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Plus, Settings } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGroup } from "@/groups/GroupContext";

/** Header control: which group the app is showing */
export const GroupSwitcher = () => {
  const { t } = useTranslation("groups");
  const { groups, group, selectGroup } = useGroup();
  if (!group) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex max-w-44 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-muted">
        <span className="truncate">{group.name}</span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {groups.map((g) => (
          <DropdownMenuItem key={g.id} onSelect={() => g.id !== group.id && selectGroup(g.id)}>
            <Check className={g.id === group.id ? "size-4" : "size-4 opacity-0"} />
            <span className="truncate">{g.name}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/group"><Settings className="size-4" /> {t("switcher.manage")}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/groups/new"><Plus className="size-4" /> {t("switcher.create")}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
