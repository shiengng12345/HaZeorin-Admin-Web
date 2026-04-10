export const INTERVAL_OPTIONS = [
  {
    label: "Monthly",
    value: "PLAN_INTERVAL_MONTHLY"
  },
  {
    label: "Yearly",
    value: "PLAN_INTERVAL_YEARLY"
  }
] as const;

export type PlanIntervalValue = (typeof INTERVAL_OPTIONS)[number]["value"];
export type SortDirection = "SORT_TYPE_ASC" | "SORT_TYPE_DESC";

export type PlanListState = {
  page: number;
  limit: number;
  search: string;
  sortBy: string;
  sortType: SortDirection;
  isActive: "" | "true" | "false";
  interval: "" | PlanIntervalValue;
};

export type PlanFormState = {
  code: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  interval: "" | PlanIntervalValue;
  isActive: boolean;
};

export const DEFAULT_PLAN_LIST_STATE: PlanListState = {
  page: 1,
  limit: 10,
  search: "",
  sortBy: "price_cents",
  sortType: "SORT_TYPE_ASC",
  isActive: "",
  interval: ""
};

export function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function parsePlanListState(
  params: Record<string, string | string[] | undefined>
): PlanListState {
  const search = singleValue(params.search)?.trim() ?? "";
  const sortBy = singleValue(params.sortBy)?.trim() || DEFAULT_PLAN_LIST_STATE.sortBy;
  const rawSortType = singleValue(params.sortType)?.trim();
  const sortType =
    rawSortType === "SORT_TYPE_DESC" ? "SORT_TYPE_DESC" : DEFAULT_PLAN_LIST_STATE.sortType;
  const rawIsActive = singleValue(params.isActive)?.trim();
  const isActive = rawIsActive === "true" || rawIsActive === "false" ? rawIsActive : "";
  const rawInterval = singleValue(params.interval)?.trim();
  const interval = isPlanInterval(rawInterval) ? rawInterval : "";

  return {
    page: parsePositiveInt(singleValue(params.page), DEFAULT_PLAN_LIST_STATE.page),
    limit: parsePositiveInt(singleValue(params.limit), DEFAULT_PLAN_LIST_STATE.limit),
    search,
    sortBy,
    sortType,
    isActive,
    interval
  };
}

export function buildPlansPath(
  state: Partial<PlanListState> & {
    error?: string;
    message?: string;
  } = {}
) {
  const search = new URLSearchParams();
  const merged = {
    ...DEFAULT_PLAN_LIST_STATE,
    ...state
  };

  if (merged.page > 1) {
    search.set("page", String(merged.page));
  }

  if (merged.limit !== DEFAULT_PLAN_LIST_STATE.limit) {
    search.set("limit", String(merged.limit));
  }

  if (merged.search) {
    search.set("search", merged.search);
  }

  if (merged.sortBy && merged.sortBy !== DEFAULT_PLAN_LIST_STATE.sortBy) {
    search.set("sortBy", merged.sortBy);
  }

  if (merged.sortType !== DEFAULT_PLAN_LIST_STATE.sortType) {
    search.set("sortType", merged.sortType);
  }

  if (merged.isActive) {
    search.set("isActive", merged.isActive);
  }

  if (merged.interval) {
    search.set("interval", merged.interval);
  }

  if (state.error) {
    search.set("error", state.error);
  }

  if (state.message) {
    search.set("message", state.message);
  }

  const query = search.toString();
  return query ? `/plans?${query}` : "/plans";
}

export function sanitizePlanReturnPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/plans") || value.startsWith("//")) {
    return "/plans";
  }

  return value;
}

export function formatPriceFromCents(priceCents: number, currency: string) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(priceCents / 100);
}

export function formatPriceForInput(priceCents: number) {
  return (priceCents / 100).toFixed(2);
}

export function formatPlanInterval(interval: string) {
  return interval
    .replace("PLAN_INTERVAL_", "")
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parsePriceToCents(value: string) {
  const normalized = value.trim();

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100);
}

export function normalizeCurrency(value: string) {
  return value.trim().toUpperCase();
}

export function defaultPlanFormState(): PlanFormState {
  return {
    code: "",
    name: "",
    description: "",
    price: "",
    currency: "MYR",
    interval: "PLAN_INTERVAL_MONTHLY",
    isActive: true
  };
}

export function readPlanFormState(
  params: Record<string, string | string[] | undefined>,
  fallback: Partial<PlanFormState> = {}
): PlanFormState {
  const defaults = {
    ...defaultPlanFormState(),
    ...fallback
  };

  const rawInterval = singleValue(params.interval)?.trim();
  const interval = isPlanInterval(rawInterval) ? rawInterval : defaults.interval;
  const rawActive = singleValue(params.isActive)?.trim();

  return {
    code: singleValue(params.code) ?? defaults.code,
    name: singleValue(params.name) ?? defaults.name,
    description: singleValue(params.description) ?? defaults.description,
    price: singleValue(params.price) ?? defaults.price,
    currency: singleValue(params.currency) ?? defaults.currency,
    interval,
    isActive:
      rawActive === "true" ? true : rawActive === "false" ? false : defaults.isActive
  };
}

function singleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isPlanInterval(value: string | undefined | null): value is PlanIntervalValue {
  return value === "PLAN_INTERVAL_MONTHLY" || value === "PLAN_INTERVAL_YEARLY";
}
