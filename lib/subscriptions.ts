import type { SortDirection } from "@/lib/plans";

export const SUBSCRIPTION_STATUS_OPTIONS = [
  {
    label: "Active",
    value: "SUBSCRIPTION_STATUS_ACTIVE"
  },
  {
    label: "Cancelled",
    value: "SUBSCRIPTION_STATUS_CANCELLED"
  }
] as const;

export type SubscriptionStatusValue =
  (typeof SUBSCRIPTION_STATUS_OPTIONS)[number]["value"];

export type SubscriptionListState = {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortType: SortDirection;
  status: "" | SubscriptionStatusValue;
  planId: string;
};

export const DEFAULT_SUBSCRIPTION_LIST_STATE: SubscriptionListState = {
  page: 1,
  limit: 10,
  search: "",
  sortBy: "ts.started_at",
  sortType: "SORT_TYPE_DESC",
  status: "",
  planId: ""
};

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function isSubscriptionStatus(
  value: string | undefined | null
): value is SubscriptionStatusValue {
  return (
    value === "SUBSCRIPTION_STATUS_ACTIVE" ||
    value === "SUBSCRIPTION_STATUS_CANCELLED"
  );
}

export function parseSubscriptionListState(
  params: Record<string, string | string[] | undefined>
): SubscriptionListState {
  const search = singleValue(params.search)?.trim() ?? "";
  const sortBy = singleValue(params.sortBy)?.trim() || DEFAULT_SUBSCRIPTION_LIST_STATE.sortBy;
  const rawSortType = singleValue(params.sortType)?.trim();
  const sortType =
    rawSortType === "SORT_TYPE_ASC" ? "SORT_TYPE_ASC" : DEFAULT_SUBSCRIPTION_LIST_STATE.sortType;
  const rawStatus = singleValue(params.status)?.trim();
  const status = isSubscriptionStatus(rawStatus) ? rawStatus : "";

  return {
    page: parsePositiveInt(singleValue(params.page), DEFAULT_SUBSCRIPTION_LIST_STATE.page),
    limit: parsePositiveInt(singleValue(params.limit), DEFAULT_SUBSCRIPTION_LIST_STATE.limit),
    search,
    sortBy,
    sortType,
    status,
    planId: singleValue(params.planId)?.trim() ?? ""
  };
}

export function buildSubscriptionsPath(
  state: Partial<SubscriptionListState> & {
    error?: string;
    message?: string;
  } = {}
) {
  const search = new URLSearchParams();
  const merged = {
    ...DEFAULT_SUBSCRIPTION_LIST_STATE,
    ...state
  };

  if (merged.page > 1) {
    search.set("page", String(merged.page));
  }

  if (merged.limit !== DEFAULT_SUBSCRIPTION_LIST_STATE.limit) {
    search.set("limit", String(merged.limit));
  }

  if (merged.search) {
    search.set("search", merged.search);
  }

  if (merged.sortBy && merged.sortBy !== DEFAULT_SUBSCRIPTION_LIST_STATE.sortBy) {
    search.set("sortBy", merged.sortBy);
  }

  if (merged.sortType !== DEFAULT_SUBSCRIPTION_LIST_STATE.sortType) {
    search.set("sortType", merged.sortType);
  }

  if (merged.status) {
    search.set("status", merged.status);
  }

  if (merged.planId) {
    search.set("planId", merged.planId);
  }

  if (state.error) {
    search.set("error", state.error);
  }

  if (state.message) {
    search.set("message", state.message);
  }

  const query = search.toString();
  return query ? `/subscriptions?${query}` : "/subscriptions";
}

export function sanitizeSubscriptionReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/subscriptions") || value.startsWith("//")) {
    return "/subscriptions";
  }

  return value;
}

export function formatSubscriptionStatus(status: string) {
  return status
    .replace("SUBSCRIPTION_STATUS_", "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatSubscriptionDate(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

export function parseSeatCount(value: string) {
  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}
