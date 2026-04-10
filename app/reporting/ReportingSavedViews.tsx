import Link from "next/link";

import type { ReportingSavedPreset } from "@/lib/grpc/reporting-client";
import {
  buildReportingPath,
  formatReportingWindow,
  parseReportingState,
  type ReportingState
} from "@/lib/reporting";
import {
  buildDefaultReportingPresetName,
  isSameReportingState
} from "@/lib/reporting-presets";
import {
  deleteReportingPresetAction,
  renameReportingPresetAction,
  saveReportingPresetAction
} from "./actions";

type ReportingSavedViewsProps = {
  currentState: ReportingState;
  scopeSummary: string;
  returnTo: string;
  savedPresets: ReportingSavedPreset[];
};

function formatSavedAt(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Saved just now";
  }

  return `Saved ${new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed)}`;
}

export function ReportingSavedViews({
  currentState,
  scopeSummary,
  returnTo,
  savedPresets
}: ReportingSavedViewsProps) {
  return (
    <section className="screen-saved-view-panel" aria-label="Saved reporting views">
      <div className="screen-saved-view-head">
        <div>
          <h2>Saved views</h2>
          <p className="module-hero-copy screen-saved-view-note">
            Save the current tenant reporting window to your workspace account and reopen it from
            any signed-in admin session later.
          </p>
        </div>
        <span className="query-chip">Stored in workspace</span>
      </div>

      <form action={saveReportingPresetAction} className="screen-saved-view-form">
        <input type="hidden" name="returnTo" value={returnTo} />
        <input type="hidden" name="scopeSummary" value={scopeSummary} />
        <input type="hidden" name="window" value={currentState.window} />

        <label className="field screen-saved-view-field" htmlFor="reportingPresetName">
          <span className="sr-only">Saved view name</span>
          <input
            id="reportingPresetName"
            name="name"
            type="text"
            maxLength={60}
            defaultValue={buildDefaultReportingPresetName(currentState)}
            placeholder={buildDefaultReportingPresetName(currentState)}
          />
        </label>

        <button type="submit" className="button-secondary">
          Save current view
        </button>
      </form>

      {savedPresets.length > 0 ? (
        <div className="screen-saved-view-list">
          {savedPresets.map((preset) => {
            const presetState = parseReportingState({
              window: preset.window
            });
            const isCurrent = isSameReportingState(presetState, currentState);

            return (
              <article key={preset.id} className="screen-saved-view-card">
                <div className="screen-saved-view-copy">
                  <div className="screen-saved-view-title-row">
                    <strong>{preset.name}</strong>
                    {isCurrent ? <span className="query-chip">Current view</span> : null}
                  </div>
                  <span>{preset.scopeSummary}</span>
                  <span>{formatSavedAt(preset.updatedAt)}</span>
                </div>

                <div className="screen-saved-view-actions">
                  <Link href={buildReportingPath(presetState)} className="button-ghost">
                    Open
                  </Link>
                  <form
                    action={renameReportingPresetAction}
                    className="screen-saved-view-inline-form"
                  >
                    <input type="hidden" name="presetId" value={preset.id} />
                    <input type="hidden" name="previousName" value={preset.name} />
                    <input type="hidden" name="scopeSummary" value={preset.scopeSummary} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input type="hidden" name="window" value={presetState.window} />
                    <label className="sr-only" htmlFor={`rename-${preset.id}`}>
                      Rename saved view
                    </label>
                    <input
                      id={`rename-${preset.id}`}
                      name="name"
                      type="text"
                      maxLength={60}
                      defaultValue={preset.name}
                      className="screen-saved-view-inline-input"
                    />
                    <button type="submit" className="button-ghost">
                      Rename
                    </button>
                  </form>
                  <form action={deleteReportingPresetAction}>
                    <input type="hidden" name="presetId" value={preset.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button type="submit" className="button-ghost">
                      Remove
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          Save a reporting window here to reopen the same tenant snapshot later from any admin
          workspace session.
        </div>
      )}
    </section>
  );
}
