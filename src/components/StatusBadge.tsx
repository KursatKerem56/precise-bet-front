import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "flag" | "agree" | "hold";

interface StatusBadgeProps {
  tone?: BadgeTone;
  title?: string;
  children: ReactNode;
}

export function StatusBadge({ tone = "neutral", title, children }: StatusBadgeProps) {
  return (
    <span className={`badge badge--${tone}`} title={title}>
      {children}
    </span>
  );
}
