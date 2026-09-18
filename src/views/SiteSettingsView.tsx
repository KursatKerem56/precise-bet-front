import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonStack } from "../components/Skeleton";
import { ApiErrorState } from "../components/ApiErrorState";
import { useToast } from "../components/Toast";
import { useApiResource } from "../lib/useApiResource";
import { fetchSiteLinks, persistSiteLink } from "../lib/dataSource";
import { ApiError } from "../lib/api";
import { formatTimestamp } from "../lib/format";
import { SITES, SITE_LABELS, type Site } from "../types/domain";
import type { SiteLink } from "../types/api";

function validateUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter the address fixtures are collected from.";

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return "That isn't a valid address. Include https:// at the start.";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "The address must start with http:// or https://.";
  }
  if (!parsed.hostname.includes(".")) {
    return "Include the full domain, for example https://example.com.";
  }
  return null;
}

export function SiteSettingsView() {
  const links = useApiResource(fetchSiteLinks);
  const toast = useToast();

  const [site, setSite] = useState<Site>("VIRUS_BET");
  const [url, setUrl] = useState("");
  const [dirty, setDirty] = useState(false);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);

  const linkBySite = useMemo(() => {
    const map = new Map<Site, SiteLink>();
    for (const entry of links.data ?? []) map.set(entry.site, entry);
    return map;
  }, [links.data]);

  // Fill from the API on load and after a save, unless the field is being edited.
  useEffect(() => {
    if (!dirty) setUrl(linkBySite.get(site)?.link ?? "");
  }, [linkBySite, site, dirty]);

  const validationError = validateUrl(url);
  const showValidation = touched && validationError !== null;
  const existingLink = linkBySite.get(site)?.link ?? null;
  const unchanged = existingLink !== null && existingLink === url.trim();

  const selectSite = (next: Site) => {
    setSite(next);
    setUrl(linkBySite.get(next)?.link ?? "");
    setDirty(false);
    setTouched(false);
    setSubmitError(null);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setSubmitError(null);
    if (validationError) return;

    setSaving(true);
    try {
      await persistSiteLink({ site, link: url.trim() });
      setDirty(false);
      links.reload();
      toast.push({
        tone: "success",
        title: "Link saved",
        description: `${SITE_LABELS[site]} now points to ${url.trim()}`,
      });
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError("unknown", "The link was not saved.", null, null);
      setSubmitError(apiError);
      toast.push({
        tone: "error",
        title: "Link not saved",
        description: apiError.message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Site links"
        description="The address each site's fixtures are collected from."
        actions={
          <button
            type="button"
            className="button"
            onClick={links.reload}
            disabled={links.loading}
          >
            <RefreshCw
              size={14}
              aria-hidden="true"
              className={links.loading ? "spin" : undefined}
            />
            Refresh
          </button>
        }
      />

      <div className="section-split section-split--form">
        <Panel title="Save a link" description="Replaces the stored address for one site.">
          <form className="form" onSubmit={onSubmit} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="settings-site">
                Site
              </label>
              <select
                id="settings-site"
                className="field__control"
                value={site}
                disabled={saving}
                onChange={(event) => selectSite(event.target.value as Site)}
              >
                {SITES.map((option) => (
                  <option key={option} value={option}>
                    {SITE_LABELS[option]}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="settings-url">
                Address
              </label>
              <input
                id="settings-url"
                type="url"
                inputMode="url"
                className={`field__control${showValidation ? " field__control--invalid" : ""}`}
                value={url}
                placeholder="https://example.com"
                autoComplete="off"
                disabled={saving || links.loading}
                aria-invalid={showValidation}
                aria-describedby="settings-url-help"
                onChange={(event) => {
                  setUrl(event.target.value);
                  setDirty(true);
                  setSubmitError(null);
                }}
                onBlur={() => setTouched(true)}
              />
              <p
                id="settings-url-help"
                className={`field__help${showValidation ? " field__help--error" : ""}`}
                role={showValidation ? "alert" : undefined}
              >
                {showValidation
                  ? validationError
                  : existingLink
                    ? "Saving replaces the address stored for this site."
                    : "This site has no address stored yet."}
              </p>
            </div>

            {submitError ? <ApiErrorState error={submitError} /> : null}

            <div className="form__actions">
              <button
                type="submit"
                className="button button--primary button--wide"
                disabled={saving || validationError !== null || unchanged}
              >
                {saving ? <Loader2 size={14} aria-hidden="true" className="spin" /> : null}
                {saving ? "Saving" : "Save link"}
              </button>
              {unchanged && !saving ? (
                <span className="form__note">This address is already saved.</span>
              ) : null}
            </div>

            <p className="form__security">
              The auth token comes from the environment and is never shown here.
            </p>
          </form>
        </Panel>

        <Panel title="Stored links" description="What each site currently points to.">
          {links.error ? (
            <ApiErrorState error={links.error} onRetry={links.reload} />
          ) : links.loading ? (
            <SkeletonStack rows={3} />
          ) : (
            <ul className="links">
              {SITES.map((option) => {
                const entry = linkBySite.get(option);
                return (
                  <li key={option} className="link-row">
                    <div className="link-row__head">
                      <h3 className="link-row__site">{SITE_LABELS[option]}</h3>
                      {entry ? (
                        <StatusBadge tone="agree">Set</StatusBadge>
                      ) : (
                        <StatusBadge tone="hold">Not set</StatusBadge>
                      )}
                    </div>
                    {entry ? (
                      <a
                        className="link-row__url"
                        href={entry.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {entry.link}
                      </a>
                    ) : (
                      <p className="link-row__empty">
                        Add an address so fixtures can be collected from this site.
                      </p>
                    )}
                    <div className="link-row__foot">
                      <span>{entry?.updatedAt ? `Saved ${formatTimestamp(entry.updatedAt)}` : ""}</span>
                      <button
                        type="button"
                        className="button button--quiet"
                        onClick={() => selectSite(option)}
                      >
                        {entry ? "Change" : "Add"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
