import type { ReactNode } from "react";
import { Skeleton } from "./Skeleton";

interface MetricCardProps {
  value: string;
  label: string;
  hint?: string;
  flag?: boolean;
  loading?: boolean;
}

/** One cell of the ledger strip: the count reads first, its name underneath. */
export function MetricCard({
  value,
  label,
  hint,
  flag = false,
  loading = false,
}: MetricCardProps) {
  return (
    <article className={`ledger__cell${flag ? " ledger__cell--flag" : ""}`}>
      {loading ? (
        <Skeleton width="3.5rem" height="2.25rem" />
      ) : (
        <p className="ledger__value">{value}</p>
      )}
      <h2 className="ledger__label">{label}</h2>
      <p className="ledger__hint">{hint ?? " "}</p>
    </article>
  );
}

export function Ledger({ children }: { children: ReactNode }) {
  return <div className="ledger">{children}</div>;
}
