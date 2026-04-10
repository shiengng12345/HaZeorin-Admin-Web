"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { cookies } from "next/headers";
import { z } from "zod";

import { getAdminAccessErrorMessage, isAllowedAdminUserId } from "@/lib/env";
import { login } from "@/lib/grpc/auth-client";
import { GrpcBusinessError } from "@/lib/grpc/errors";
import {
  clearSessionFromStore,
  type MutableCookieStore
} from "@/lib/session";
import { loginSessionWithStore } from "@/lib/session-core";

const LoginPayloadSchema = z.object({
  email: z.string().trim().min(1, "Please enter your operator email."),
  password: z.string().min(1, "Please enter your password.")
});

function buildLoginRedirect({
  error,
  email
}: {
  error?: string;
  email?: string;
}) {
  const search = new URLSearchParams();

  if (error) {
    search.set("error", error);
  }

  if (email) {
    search.set("email", email);
  }

  const query = search.toString();
  return query ? `/login?${query}` : "/login";
}

export async function loginAction(formData: FormData) {
  const parsed = LoginPayloadSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    const [issue] = parsed.error.issues;
    redirect(
      buildLoginRedirect({
        error: issue?.message ?? "Login payload is incomplete.",
        email: String(formData.get("email") ?? "")
      })
    );
  }

  const cookieStore = (await cookies()) as unknown as MutableCookieStore;

  try {
    const session = await loginSessionWithStore(cookieStore, parsed.data, login);

    if (!isAllowedAdminUserId(session.userId)) {
      clearSessionFromStore(cookieStore);
      redirect(
        buildLoginRedirect({
          error: getAdminAccessErrorMessage(),
          email: parsed.data.email
        })
      );
    }

  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    clearSessionFromStore(cookieStore);

    const message =
      error instanceof GrpcBusinessError
        ? error.message
        : error instanceof Error && process.env.NODE_ENV !== "production"
          ? `${error.name}: ${error.message}`
          : "Unable to sign in right now. Please verify the backend is running.";

    redirect(
      buildLoginRedirect({
        error: message,
        email: parsed.data.email
      })
    );
  }

  redirect("/");
}
