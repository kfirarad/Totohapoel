import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, X, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const tones = {
  warn: { className: "bg-warn text-warn-foreground border-warn-border", Icon: AlertCircle, role: "status" },
  success: { className: "bg-brand text-brand-foreground border-brand", Icon: CheckCircle2, role: "status" },
  error: { className: "bg-error text-error-foreground border-error-border", Icon: XCircle, role: "alert" },
} as const;

/** One banner shape for every save state: icon, message, optional inline action, optional close */
export const Banner = ({
  tone,
  children,
  action,
  onClose,
}: {
  tone: keyof typeof tones;
  children: ReactNode;
  action?: { label: string; onClick: () => void; disabled?: boolean };
  onClose?: () => void;
}) => {
  const { t } = useTranslation();
  const { className, Icon, role } = tones[tone];
  return (
    <div role={role} className={cn("flex min-h-11 items-center gap-2 rounded-xl border px-3 py-1.5", className)}>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="flex-1 text-sm font-medium">{children}</span>
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.disabled}
          className="h-8 shrink-0 rounded-lg px-2 text-[13px] font-semibold underline underline-offset-2 disabled:opacity-50"
        >
          {action.label}
        </button>
      )}
      {onClose && (
        <button
          onClick={onClose}
          aria-label={t("common.close")}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/10"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
};
