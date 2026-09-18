import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, meta, actions }: PageHeaderProps) {
  return (
    <header className="page-head">
      <div>
        <h1 className="page-head__title">{title}</h1>
        <p className="page-head__description">{description}</p>
      </div>
      {meta || actions ? (
        <div className="page-head__actions">
          {meta ? <div className="page-head__meta">{meta}</div> : null}
          {actions}
        </div>
      ) : null}
    </header>
  );
}
