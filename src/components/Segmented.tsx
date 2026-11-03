import { cn } from "@/lib/utils";

export const Segmented = <T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground">{label}</span>
    <div role="group" aria-label={label} className="flex gap-0.5 rounded-lg bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-8 whitespace-nowrap rounded-md px-3 text-[13px]",
            value === o.value
              ? "bg-card font-semibold text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  </div>
);
