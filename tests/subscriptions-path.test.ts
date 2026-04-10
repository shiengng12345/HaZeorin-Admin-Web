import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSubscriptionsPath,
  sanitizeSubscriptionReturnPath
} from "../lib/subscriptions";

test("subscriptions paths preserve query state for shell-driven returns", () => {
  const path = buildSubscriptionsPath({
    page: 3,
    limit: 20,
    search: "growth",
    sortBy: "ts.status",
    sortType: "SORT_TYPE_ASC",
    status: "SUBSCRIPTION_STATUS_ACTIVE",
    planId: "plan_growth_monthly"
  });

  assert.equal(
    path,
    "/subscriptions?page=3&limit=20&search=growth&sortBy=ts.status&sortType=SORT_TYPE_ASC&status=SUBSCRIPTION_STATUS_ACTIVE&planId=plan_growth_monthly"
  );
  assert.equal(
    sanitizeSubscriptionReturnPath(path),
    path
  );
});

test("subscriptions return paths reject non-subscription routes", () => {
  assert.equal(sanitizeSubscriptionReturnPath("/plans?search=growth"), "/subscriptions");
  assert.equal(sanitizeSubscriptionReturnPath("https://evil.example"), "/subscriptions");
});
