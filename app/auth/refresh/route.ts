import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";

import {
  buildLoginPath,
  clearSessionFromStore,
  refreshSessionWithStore,
  sanitizeNextPath,
  type MutableCookieStore
} from "@/lib/session";
import { GrpcBusinessError } from "@/lib/grpc/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
  const cookieStore = (await cookies()) as unknown as MutableCookieStore;
  let session = null;

  try {
    session = await refreshSessionWithStore(cookieStore);
  } catch (error) {
    const message =
      error instanceof GrpcBusinessError
        ? error.message
        : "Unable to refresh your session right now. Please try again.";
    return NextResponse.redirect(new URL(buildLoginPath(message), request.url));
  }

  if (!session) {
    clearSessionFromStore(cookieStore);
    return NextResponse.redirect(
      new URL(buildLoginPath("Your session expired. Please sign in again."), request.url)
    );
  }

  return NextResponse.redirect(new URL(nextPath, request.url));
}
