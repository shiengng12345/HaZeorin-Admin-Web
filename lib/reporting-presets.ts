import {
  DEFAULT_REPORTING_STATE,
  formatReportingWindow,
  parseReportingState,
  type ReportingState
} from "@/lib/reporting";

export function normalizeReportingPresetName(value: string | undefined | null) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 60);
}

export function buildDefaultReportingPresetName(state: Partial<ReportingState>) {
  return `${formatReportingWindow(state.window ?? DEFAULT_REPORTING_STATE.window)} view`;
}

export function normalizeReportingPresetState(state: Partial<ReportingState>): ReportingState {
  return parseReportingState({
    window: state.window
  });
}

export function isSameReportingState(left: ReportingState, right: ReportingState) {
  return left.window === right.window;
}
