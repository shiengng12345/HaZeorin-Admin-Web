import "server-only";

import { z } from "zod";

import { createAdminUserAccessLookup } from "@/lib/admin-allowlist";
import type { AdminCapability } from "@/lib/admin-allowlist";

const ServerEnvSchema = z.object({
  HAZEORIN_BACKEND_GRPC_ADDR: z.string().trim().min(1).default("127.0.0.1:50051"),
  HAZEORIN_BACKEND_GRPC_TRANSPORT: z.enum(["insecure", "tls"]).default("insecure"),
  HAZEORIN_BACKEND_GRPC_CA_CERT_PATH: z.string().trim().default(""),
  HAZEORIN_BACKEND_GRPC_TLS_SERVER_NAME: z.string().trim().default(""),
  HAZEORIN_ADMIN_USER_IDS: z.string().default(""),
  HAZEORIN_ADMIN_SUBSCRIPTION_USER_IDS: z.string().default(""),
  HAZEORIN_ADMIN_APPROVAL_FLOW_USER_IDS: z.string().default(""),
  HAZEORIN_ADMIN_REPORTING_USER_IDS: z.string().default("")
});

const parsedEnv = ServerEnvSchema.parse({
  HAZEORIN_BACKEND_GRPC_ADDR:
    process.env.HAZEORIN_BACKEND_GRPC_ADDR ?? "127.0.0.1:50051",
  HAZEORIN_BACKEND_GRPC_TRANSPORT:
    process.env.HAZEORIN_BACKEND_GRPC_TRANSPORT ?? "insecure",
  HAZEORIN_BACKEND_GRPC_CA_CERT_PATH:
    process.env.HAZEORIN_BACKEND_GRPC_CA_CERT_PATH ?? "",
  HAZEORIN_BACKEND_GRPC_TLS_SERVER_NAME:
    process.env.HAZEORIN_BACKEND_GRPC_TLS_SERVER_NAME ?? "",
  HAZEORIN_ADMIN_USER_IDS: process.env.HAZEORIN_ADMIN_USER_IDS ?? "",
  HAZEORIN_ADMIN_SUBSCRIPTION_USER_IDS:
    process.env.HAZEORIN_ADMIN_SUBSCRIPTION_USER_IDS ?? "",
  HAZEORIN_ADMIN_APPROVAL_FLOW_USER_IDS:
    process.env.HAZEORIN_ADMIN_APPROVAL_FLOW_USER_IDS ?? "",
  HAZEORIN_ADMIN_REPORTING_USER_IDS:
    process.env.HAZEORIN_ADMIN_REPORTING_USER_IDS ?? ""
});

export const serverEnv = parsedEnv;

const adminUserAccessLookup = createAdminUserAccessLookup(parsedEnv);

export function hasConfiguredAdminUserAllowlist() {
  return adminUserAccessLookup.hasConfiguredAdminUserAllowlist();
}

export function isAllowedAdminUserId(userId: string) {
  return adminUserAccessLookup.isAllowedAdminUserId(userId);
}

export function isAllowedAdminCapability(userId: string, capability: AdminCapability) {
  return adminUserAccessLookup.isAllowedAdminCapability(userId, capability);
}

export function getAdminAccessErrorMessage() {
  if (!hasConfiguredAdminUserAllowlist()) {
    return "Admin access is not configured. Set HAZEORIN_ADMIN_USER_IDS or one of the capability-specific admin allowlists.";
  }

  return "This account is not allowed to use HaZeorin Admin.";
}
