"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";

import { logoutSession, switchTenant } from "@/lib/grpc/auth-client";
import { GrpcBusinessError } from "@/lib/grpc/errors";
import {
  buildLoginPath,
  clearSessionFromStore,
  executeProtectedMutation,
  sanitizeNextPath,
  type MutableCookieStore
} from "@/lib/session";
import {
  logoutSessionWithStore,
  switchTenantSessionWithStore
} from "@/lib/session-core";

const SwitchTenantSchema = z.object({
  tenantId: z.string().trim().min(1, "Choose a tenant before switching."),
  returnTo: z.string().optional().default("")
});

function appendMessageToPath(path: string, key: "error" | "message", value: string) {
  const [pathname, query = ""] = path.split("?");
  const search = new URLSearchParams(query);
  search.set(key, value);
  const serialized = search.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

export async function logoutAction() {
  const cookieStore = (await cookies()) as unknown as MutableCookieStore;

  try {
    await executeProtectedMutation((session, store) =>
      logoutSessionWithStore(store, session, logoutSession)
    );
  } catch (error) {
    clearSessionFromStore(cookieStore);

    if (isRedirectError(error)) {
      throw error;
    }

    redirect(
      buildLoginPath("Signed out on this device. Backend session revocation could not be confirmed.")
    );
  }

  redirect("/login");
}

export async function switchTenantAction(formData: FormData) {
  const parsed = SwitchTenantSchema.safeParse({
    tenantId: formData.get("tenantId"),
    returnTo: formData.get("returnTo") ?? ""
  });

  const returnTo = sanitizeNextPath(
    parsed.success ? parsed.data.returnTo : String(formData.get("returnTo") ?? "")
  );

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      appendMessageToPath(returnTo, "error", issue?.message ?? "Unable to switch tenant.")
    );
  }

  try {
    await executeProtectedMutation(async (session, cookieStore) => {
      return switchTenantSessionWithStore(
        cookieStore,
        session,
        parsed.data.tenantId,
        switchTenant
      );
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    const message =
      error instanceof GrpcBusinessError
        ? error.message
        : "Unable to switch tenant right now.";
    redirect(appendMessageToPath(returnTo, "error", message));
  }

  redirect(appendMessageToPath(returnTo, "message", "Tenant switched."));
}
