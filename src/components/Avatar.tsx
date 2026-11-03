import { useState } from "react";
import { cn } from "@/lib/utils";

const initials = (name?: string | null) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

export const Avatar = ({
  url,
  name,
  className,
}: {
  url?: string | null;
  name?: string | null;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  const base = cn("size-7 shrink-0 rounded-full", className);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        // Google's image CDN rejects many hotlinked requests that carry a referrer
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn(base, "object-cover")}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(base, "flex items-center justify-center bg-muted text-[11px] font-semibold text-muted-foreground")}
    >
      {initials(name)}
    </span>
  );
};
