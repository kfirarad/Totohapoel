import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/Segmented";
import { useToast } from "@/hooks/use-toast";
import { createGroup, type JoinPolicy } from "@/groups/api";
import { useGroup } from "@/groups/GroupContext";
import { marketName } from "@/groups/marketName";
import { DEFAULT_MARKET, getMarket, markets } from "@/markets/registry";

/** /groups/new — also what a signed-in user with no group sees */
export const CreateGroupPage = ({ firstGroup = false }: { firstGroup?: boolean }) => {
  const { t, i18n } = useTranslation("groups");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectGroup, refreshGroups } = useGroup();

  const [name, setName] = useState("");
  const [market, setMarket] = useState<string>(DEFAULT_MARKET);
  const limits = getMarket(market as typeof DEFAULT_MARKET).defaultLimits;
  const [maxDoubles, setMaxDoubles] = useState(limits.maxDoubles);
  const [maxTriples, setMaxTriples] = useState(limits.maxTriples);
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>("open");

  const create = useMutation({
    mutationFn: () => createGroup({ name: name.trim(), market, maxDoubles, maxTriples, joinPolicy }),
    onSuccess: async (group) => {
      await refreshGroups();
      selectGroup(group.id);
      navigate("/group", { replace: true });
    },
    onError: () => toast({ title: t("errors.generic"), variant: "destructive" }),
  });

  const pickMarket = (code: string) => {
    setMarket(code);
    const l = getMarket(code as typeof DEFAULT_MARKET).defaultLimits;
    setMaxDoubles(l.maxDoubles);
    setMaxTriples(l.maxTriples);
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      {firstGroup && (
        <div className="mb-6 rounded-2xl border bg-card p-5">
          <h1 className="mb-1 text-xl font-bold">{t("empty.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("empty.body")}</p>
        </div>
      )}
      <form
        className="space-y-5 rounded-2xl border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) create.mutate();
        }}
      >
        <h2 className="text-lg font-bold">{t("create.title")}</h2>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t("create.name")}</span>
          <Input value={name} maxLength={80} required onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t("create.market")}</span>
          <select
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={market}
            onChange={(e) => pickMarket(e.target.value)}
          >
            {Object.values(markets).map((m) => (
              <option key={m.code} value={m.code}>
                {marketName(m.code, i18n.language)} · {m.operator} {m.product}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("limits.doubles")}</span>
            <Input type="number" min={0} value={maxDoubles} onChange={(e) => setMaxDoubles(Number(e.target.value))} />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("limits.triples")}</span>
            <Input type="number" min={0} value={maxTriples} onChange={(e) => setMaxTriples(Number(e.target.value))} />
          </label>
        </div>
        <div className="space-y-1.5">
          <Segmented<JoinPolicy>
            label={t("policy.label")}
            value={joinPolicy}
            onChange={setJoinPolicy}
            options={[
              { value: "open", label: t("policy.open") },
              { value: "closed", label: t("policy.closed") },
            ]}
          />
          <p className="text-xs text-muted-foreground">{t(`policy.${joinPolicy}Hint`)}</p>
        </div>
        <Button type="submit" className="w-full" disabled={!name.trim() || create.isPending}>
          {t("create.submit")}
        </Button>
      </form>
    </div>
  );
};
