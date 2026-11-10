import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { joinGroup, previewGroup } from "@/groups/api";
import { useGroup } from "@/groups/GroupContext";
import { marketName } from "@/groups/marketName";

/** /join/:code — the only way into a group */
export const JoinGroupPage = () => {
  const { code = "" } = useParams();
  const { t, i18n } = useTranslation("groups");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectGroup, refreshGroups } = useGroup();
  const [pending, setPending] = useState(false);

  const { data: preview, isLoading, error } = useQuery({
    queryKey: ["groupPreview", code],
    queryFn: () => previewGroup(code),
  });

  const join = useMutation({
    mutationFn: () => joinGroup(code),
    onSuccess: async ({ group_id, status }) => {
      if (status === "pending") {
        setPending(true);
        return;
      }
      await refreshGroups();
      selectGroup(group_id);
      toast({ title: t("join.joined", { name: preview?.name }) });
      navigate("/column", { replace: true });
    },
    onError: () => toast({ title: t("errors.generic"), variant: "destructive" }),
  });

  // already in: go straight to the group
  useEffect(() => {
    if (preview?.my_status === "member") {
      selectGroup(preview.group_id);
      navigate("/column", { replace: true });
    }
  }, [preview, selectGroup, navigate]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">{t("loading")}</div>;
  if (error || !preview)
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="mb-2 text-xl font-bold">{t("join.invalidTitle")}</h1>
        <p className="text-muted-foreground">{t("join.invalidBody")}</p>
      </div>
    );

  const waiting = pending || preview.my_status === "pending";

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-2xl border bg-card p-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand/10">
          <Users className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">{t("join.invitedTo")}</p>
        <h1 className="mb-1 text-2xl font-bold">{preview.name}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {marketName(preview.market, i18n.language)} · {t("memberCount", { count: preview.member_count })}
        </p>
        {waiting ? (
          <p className="rounded-lg bg-muted p-3 text-sm">{t("join.pending")}</p>
        ) : preview.my_status === "rejected" && !join.isPending ? (
          <>
            <p className="mb-4 rounded-lg bg-muted p-3 text-sm">{t("join.rejected")}</p>
            <Button variant="outline" onClick={() => join.mutate()}>{t("join.askAgain")}</Button>
          </>
        ) : (
          <>
            <Button className="w-full" disabled={join.isPending} onClick={() => join.mutate()}>
              {preview.join_policy === "open" ? t("join.join") : t("join.request")}
            </Button>
            {preview.join_policy === "closed" && (
              <p className="mt-3 text-xs text-muted-foreground">{t("join.closedHint")}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
