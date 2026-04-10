import "server-only";

import fs from "node:fs";
import path from "node:path";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

const loaderOptions: protoLoader.Options = {
  defaults: true,
  enums: String,
  keepCase: false,
  longs: Number,
  oneofs: true
};

type LoadedNamespace = Record<string, unknown>;

let authNamespace: LoadedNamespace | null = null;
let approvalFlowNamespace: LoadedNamespace | null = null;
let reportingNamespace: LoadedNamespace | null = null;
let subscriptionNamespace: LoadedNamespace | null = null;
let tenantNamespace: LoadedNamespace | null = null;

function resolveProtoRoot(packageName: string, entryFile: string) {
  const configuredProtoRoot = process.env.HAZEORIN_PROTO_ROOT?.trim();
  const localRepoProtoRoot = path.resolve(process.cwd(), "..", "HaZeorin-Proto", "proto");
  const packageProtoRoot = path.join(process.cwd(), "node_modules", packageName, "proto");

  const candidates = [
    configuredProtoRoot || null,
    packageProtoRoot,
    localRepoProtoRoot
  ].filter((value): value is string => Boolean(value));

  for (const protoRoot of candidates) {
    if (fs.existsSync(path.join(protoRoot, entryFile))) {
      return protoRoot;
    }
  }

  throw new Error(
    `Unable to resolve proto root for ${packageName}. Checked: ${candidates.join(", ")}`
  );
}

function loadNamespace(packageName: string, entryFile: string) {
  const protoRoot = resolveProtoRoot(packageName, entryFile);
  const definition = protoLoader.loadSync(path.join(protoRoot, entryFile), {
    ...loaderOptions,
    includeDirs: [protoRoot]
  });

  return grpc.loadPackageDefinition(definition) as LoadedNamespace;
}

export function getAuthServiceConstructor() {
  if (!authNamespace) {
    authNamespace = loadNamespace("@hazeorin/auth-proto", "auth/v1/auth.proto");
  }

  return (authNamespace.HaZeorin as Record<string, unknown>).auth as Record<string, unknown>;
}

export function getApprovalFlowServiceConstructor() {
  if (!approvalFlowNamespace) {
    approvalFlowNamespace = loadNamespace(
      "@hazeorin/approvalflow-proto",
      "approvalflow/v1/approvalflow.proto"
    );
  }

  return (approvalFlowNamespace.HaZeorin as Record<string, unknown>).approvalflow as Record<
    string,
    unknown
  >;
}

export function getReportingServiceConstructor() {
  if (!reportingNamespace) {
    reportingNamespace = loadNamespace(
      "@hazeorin/reporting-proto",
      "reporting/v1/reporting.proto"
    );
  }

  return (reportingNamespace.HaZeorin as Record<string, unknown>).reporting as Record<
    string,
    unknown
  >;
}

export function getSubscriptionServiceConstructor() {
  if (!subscriptionNamespace) {
    subscriptionNamespace = loadNamespace(
      "@hazeorin/subscription-proto",
      "subscription/v1/subscription.proto"
    );
  }

  return (subscriptionNamespace.HaZeorin as Record<string, unknown>).subscription as Record<
    string,
    unknown
  >;
}

export function getTenantServiceConstructor() {
  if (!tenantNamespace) {
    tenantNamespace = loadNamespace("@hazeorin/tenant-proto", "tenant/v1/tenant.proto");
  }

  return (tenantNamespace.HaZeorin as Record<string, unknown>).tenant as Record<
    string,
    unknown
  >;
}
