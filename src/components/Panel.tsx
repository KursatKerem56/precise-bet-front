import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
}

export function Panel({ title, description, actions, children, flush = false }: PanelProps) {
  return (
    <section className="sheet">
      <header className="sheet__head">
        <div>
          <h2 className="sheet__title">{title}</h2>
          {description ? <p className="sheet__description">{description}</p> : null}
        </div>
        {actions}
      </header>
      <div className={`sheet__body${flush ? " sheet__body--flush" : ""}`}>{children}</div>
    </section>
  );
}
