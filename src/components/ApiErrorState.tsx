import type { ApiError } from "../lib/api";

interface Explanation {
  title: string;
  text: string;
  waiting: boolean;
}

function explain(error: ApiError): Explanation {
  switch (error.kind) {
    case "unauthorized":
      return {
        title: "The API rejected the auth token",
        text: "Set VITE_AUTH_TOKEN in your .env file to the token the backend expects, then restart the dev server.",
        waiting: false,
      };
    case "rate-limited":
      return {
        title: "The API is limiting requests",
        text: "It accepts about 600 requests every 30 seconds. Wait a few seconds before trying again.",
        waiting: true,
      };
    case "network":
      return {
        title: "The API did not respond",
        text: `${error.message} Start the backend, or point VITE_API_URL at the right address.`,
        waiting: true,
      };
    case "server":
      return {
        title: "The API returned an error",
        text: error.message,
        waiting: false,
      };
    default:
      return { title: "The request failed", text: error.message, waiting: false };
  }
}

interface ApiErrorStateProps {
  error: ApiError;
  onRetry?: () => void;
}

export function ApiErrorState({ error, onRetry }: ApiErrorStateProps) {
  const { title, text, waiting } = explain(error);

  return (
    <div className={`failure${waiting ? " failure--hold" : ""}`} role="alert">
      <div className="failure__body">
        <p className="failure__title">{title}</p>
        <p className="failure__text">{text}</p>
        {error.status || error.localeKey ? (
          <p className="failure__code">
            {error.status ? `HTTP ${error.status}` : null}
            {error.status && error.localeKey ? ", " : null}
            {error.localeKey}
          </p>
        ) : null}
      </div>
      {onRetry ? (
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
