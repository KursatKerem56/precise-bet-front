import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  bare?: boolean;
}

export function EmptyState({ title, description, action, bare = false }: EmptyStateProps) {
  return (
    <div className={bare ? "empty empty--bare" : "empty"}>
      <p className="empty__title">{title}</p>
      {description ? <p className="empty__text">{description}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
