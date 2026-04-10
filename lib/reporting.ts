import type { ReportingWindow } from "@/lib/grpc/reporting-client";

export const REPORTING_WINDOW_OPTIONS = [
  "REPORTING_WINDOW_ALL_TIME",
  "REPORTING_WINDOW_LAST_7_DAYS",
  "REPORTING_WINDOW_LAST_30_DAYS",
  "REPORTING_WINDOW_LAST_90_DAYS"
] as const satisfies readonly ReportingWindow[];

export type ReportingWindowFilter = (typeof REPORTING_WINDOW_OPTIONS)[number];

export type ReportingState = {
  window: ReportingWindowFilter;
};

export const DEFAULT_REPORTING_STATE: ReportingState = {
  window: "REPORTING_WINDOW_ALL_TIME"
};

export function parseReportingState(
  params: Record<string, string | string[] | undefined>
): ReportingState {
  const rawWindow = singleValue(params.window)?.trim();

  return {
    window: isReportingWindow(rawWindow)
      ? rawWindow
      : DEFAULT_REPORTING_STATE.window
  };
}

export function buildReportingPath(
  state: Partial<ReportingState> & {
    error?: string;
    message?: string;
  } = {}
) {
  const search = new URLSearchParams();
  const merged = {
    ...DEFAULT_REPORTING_STATE,
    ...state
  };

  if (merged.window !== DEFAULT_REPORTING_STATE.window) {
    search.set("window", merged.window);
  }

  if (state.error) {
    search.set("error", state.error);
  }

  if (state.message) {
    search.set("message", state.message);
  }

  const query = search.toString();
  return query ? `/reporting?${query}` : "/reporting";
}

export function sanitizeReportingReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/reporting") || value.startsWith("//")) {
    return "/reporting";
  }

  return value;
}

export function formatReportingWindow(window: ReportingWindowFilter | ReportingWindow | string) {
  switch (window) {
    case "REPORTING_WINDOW_LAST_7_DAYS":
      return "Last 7 days";
    case "REPORTING_WINDOW_LAST_30_DAYS":
      return "Last 30 days";
    case "REPORTING_WINDOW_LAST_90_DAYS":
      return "Last 90 days";
    case "REPORTING_WINDOW_ALL_TIME":
    default:
      return "All time";
  }
}

function isReportingWindow(value: string | undefined): value is ReportingWindowFilter {
  return REPORTING_WINDOW_OPTIONS.includes(value as ReportingWindowFilter);
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
