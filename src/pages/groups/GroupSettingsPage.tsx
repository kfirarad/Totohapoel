import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, Copy, RefreshCw, X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Segmented } from "@/components/Segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  decideJoinRequest, deleteGroup, fetchJoinRequests, fetchMembers, inviteUrl, regenerateInviteCode,
  removeMember, setMemberRole, updateGroup, type JoinPolicy,
} from "@/groups/api";
import { useCurrentGroup, useGroup } from "@/groups/GroupContext";
import { marketName } from "@/groups/marketName";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-3 rounded-2xl border bg-card p-5">
    <h2 className="font-semibold">{title}</h2>
    {children}
  </section>
);

/** /group — the current group: invite link, members, and (admins) settings and join requests */
export const GroupSettingsPage = () => {
  const group = useCurrentGroup();
  const { isGroupAdmin, refreshGroups } = useGroup();
  const { user } = useAuth();
  const { t, i18n } = useTranslation("groups");
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(group.name);
  const [maxDoubles, setMaxDoubles] = useState(group.max_doubles);
  const [maxTriples, setMaxTriples] = useState(group.max_triples);
  const [copied, setCopied] = useState(false);

  const members = useQuery({ queryKey: ["groupMembers", group.id], queryFn: () => fetchMembers(group.id) });
  const requests = useQuery({
    queryKey: ["joinRequests", group.id],
    queryFn: () => fetchJoinRequests(group.id),
    enabled: isGroupAdmin,
  });

  const fail = () => toast({ title: t("errors.generic"), variant: "destructive" });
  const done = (title?: string) => {
    refreshGroups();
    queryClient.invalidateQueries({ queryKey: ["groupMembers", group.id] });
    queryClient.invalidateQueries({ queryKey: ["joinRequests", group.id] });
    if (title) toast({ title });
  };

  const save = useMutation({
    mutationFn: (patch: Parameters<typeof updateGroup>[1]) => updateGroup(group.id, patch),
    onSuccess: () => done(t("settings.saved")),
    onError: fail,
  });
  const regenerate = useMutation({
    mutationFn: () => regenerateInviteCode(group.id),
    onSuccess: () => done(t("invite.regenerated")),
    onError: fail,
  });
  const decide = useMutation({
    mutationFn: ({ userId, approve }: { userId: string; approve: boolean }) => decideJoinRequest(group.id, userId, approve),
    onSuccess: () => done(),
    onError: fail,
  });
  const role = useMutation({
    mutationFn: ({ userId, admin }: { userId: string; admin: boolean }) =>
      setMemberRole(group.id, userId, admin ? "admin" : "member"),
    onSuccess: () => done(),
    onError: () => toast({ title: t("errors.lastAdmin"), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removeMember(group.id, userId),
    onSuccess: async (_, userId) => {
      if (userId === user?.id) {
        await refreshGroups();
        navigate("/", { replace: true });
      } else done();
    },
    onError: () => toast({ title: t("errors.lastAdmin"), variant: "destructive" }),
  });
  const destroy = useMutation({
    mutationFn: () => deleteGroup(group.id),
    onSuccess: async () => {
      await refreshGroups();
      navigate("/", { replace: true });
    },
    onError: fail,
  });

  const link = inviteUrl(group.invite_code);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      fail();
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 md:py-8">
      <div>
        <h1 className="text-2xl font-bold">{group.name}</h1>
        <p className="text-sm text-muted-foreground">
          {marketName(group.market, i18n.language)} · {t(`policy.${group.join_policy}`)} ·{" "}
          {t("limitsSummary", { doubles: group.max_doubles, triples: group.max_triples })}
        </p>
      </div>

      <Section title={t("invite.title")}>
        <p className="text-sm text-muted-foreground">{t(`policy.${group.join_policy}Hint`)}</p>
        <div className="flex gap-2">
          <Input readOnly dir="ltr" value={link} onFocus={(e) => e.target.select()} />
          <Button variant="outline" onClick={copy} aria-label={t("invite.copy")}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        {isGroupAdmin && (
          <Button
            variant="ghost"
            size="sm"
            disabled={regenerate.isPending}
            onClick={() => window.confirm(t("invite.regenerateConfirm")) && regenerate.mutate()}
          >
            <RefreshCw className="size-4" /> {t("invite.regenerate")}
          </Button>
        )}
      </Section>

      {isGroupAdmin && !!requests.data?.length && (
        <Section title={t("requests.title", { count: requests.data.length })}>
          <ul className="divide-y">
            {requests.data.map((r) => (
              <li key={r.user_id} className="flex items-center gap-3 py-2">
                <Avatar url={r.profiles?.avatar_url} name={r.profiles?.name} className="size-8" />
                <span className="flex-1 truncate">{r.profiles?.name}</span>
                <Button size="sm" onClick={() => decide.mutate({ userId: r.user_id, approve: true })}>
                  <Check className="size-4" /> {t("requests.approve")}
                </Button>
                <Button size="sm" variant="outline" aria-label={t("requests.reject")}
                  onClick={() => decide.mutate({ userId: r.user_id, approve: false })}>
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {isGroupAdmin && (
        <Section title={t("settings.title")}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ name: name.trim(), max_doubles: maxDoubles, max_triples: maxTriples });
            }}
          >
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("create.name")}</span>
              <Input value={name} maxLength={80} required onChange={(e) => setName(e.target.value)} />
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
            <p className="text-xs text-muted-foreground">{t("limits.hint")}</p>
            <Button type="submit" disabled={save.isPending || !name.trim()}>{t("settings.save")}</Button>
          </form>
          <div className="border-t pt-4">
            <Segmented<JoinPolicy>
              label={t("policy.label")}
              value={group.join_policy}
              onChange={(join_policy) => save.mutate({ join_policy })}
              options={[
                { value: "open", label: t("policy.open") },
                { value: "closed", label: t("policy.closed") },
              ]}
            />
          </div>
        </Section>
      )}

      <Section title={t("memberCount", { count: members.data?.length ?? 0 })}>
        <ul className="divide-y">
          {members.data?.map((m) => (
            <li key={m.user_id} className="flex items-center gap-3 py-2">
              <Avatar url={m.profiles?.avatar_url} name={m.profiles?.name} className="size-8" />
              <span className="flex-1 truncate">
                {m.profiles?.name}
                {m.role === "admin" && (
                  <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{t("roles.admin")}</span>
                )}
              </span>
              {isGroupAdmin && m.user_id !== user?.id && (
                <>
                  <Button size="sm" variant="ghost"
                    onClick={() => role.mutate({ userId: m.user_id, admin: m.role !== "admin" })}>
                    {m.role === "admin" ? t("roles.demote") : t("roles.promote")}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive"
                    onClick={() => window.confirm(t("members.removeConfirm", { name: m.profiles?.name })) && remove.mutate(m.user_id)}>
                    {t("members.remove")}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline"
          onClick={() => window.confirm(t("leave.confirm", { name: group.name })) && remove.mutate(user!.id)}>
          {t("leave.button")}
        </Button>
        {isGroupAdmin && (
          <Button variant="outline" className="text-destructive"
            onClick={() => window.prompt(t("delete.confirm", { name: group.name })) === group.name && destroy.mutate()}>
            {t("delete.button")}
          </Button>
        )}
      </div>
    </div>
  );
};
