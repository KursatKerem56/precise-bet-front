import { useState } from "react";
import { ToastProvider } from "./components/Toast";
import { ThemeToggle } from "./components/ThemeToggle";
import { DashboardView } from "./views/DashboardView";
import { MatchesView } from "./views/MatchesView";
import { ComparedMatchesView } from "./views/ComparedMatchesView";
import { SiteSettingsView } from "./views/SiteSettingsView";
import { hasAuthToken, useSampleData } from "./lib/api";
import { useTheme } from "./lib/useTheme";
import type { ViewKey } from "./types/navigation";

const NAV_ITEMS: Array<{ key: ViewKey; label: string }> = [
  { key: "dashboard", label: "Overview" },
  { key: "matches", label: "Matches" },
  { key: "compared", label: "Conflicts" },
  { key: "settings", label: "Site links" },
];

function App() {
  const [view, setView] = useState<ViewKey>("dashboard");
  useTheme();

  return (
    <ToastProvider>
      <div className="app">
        <header className="app-bar">
          <div className="app-bar__inner">
            <p className="wordmark">
              Precise Bet
              {useSampleData ? (
                <span className="wordmark__sample">Sample data</span>
              ) : null}
            </p>

            <nav className="app-nav" aria-label="Primary">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`app-nav__item${view === item.key ? " app-nav__item--active" : ""}`}
                  aria-current={view === item.key ? "page" : undefined}
                  onClick={() => setView(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <ThemeToggle />
          </div>
        </header>

        {!hasAuthToken && !useSampleData ? (
          <p className="notice" role="status">
            No auth token is set, so every protected request will fail. Add{" "}
            <code>VITE_AUTH_TOKEN</code> to your .env file and restart the dev
            server.
          </p>
        ) : null}

        <main className="app-main">
          {view === "dashboard" ? <DashboardView onNavigate={setView} /> : null}
          {view === "matches" ? <MatchesView /> : null}
          {view === "compared" ? <ComparedMatchesView /> : null}
          {view === "settings" ? <SiteSettingsView /> : null}
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;
