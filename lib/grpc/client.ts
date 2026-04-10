import "server-only";

import { randomUUID } from "node:crypto";

import * as grpc from "@grpc/grpc-js";

import { serverEnv } from "@/lib/env";
import {
  GrpcTransportError,
  GrpcUnauthenticatedError
} from "@/lib/grpc/errors";
import {
  getAuthServiceConstructor,
  getApprovalFlowServiceConstructor,
  getReportingServiceConstructor,
  getSubscriptionServiceConstructor,
  getTenantServiceConstructor
} from "@/lib/grpc/proto";
import { createBackendGrpcTransportConfig } from "@/lib/grpc/transport";

type UnaryCallback<TResponse> = (
  error: grpc.ServiceError | null,
  response: TResponse
) => void;

type UnaryClient = grpc.Client & {
  [methodName: string]: unknown;
};

let authClient: UnaryClient | null = null;
let approvalFlowClient: UnaryClient | null = null;
let reportingClient: UnaryClient | null = null;
let subscriptionClient: UnaryClient | null = null;
let tenantClient: UnaryClient | null = null;

function createClient(serviceConstructor: grpc.ServiceClientConstructor) {
  const transport = createBackendGrpcTransportConfig({
    address: serverEnv.HAZEORIN_BACKEND_GRPC_ADDR,
    transport: serverEnv.HAZEORIN_BACKEND_GRPC_TRANSPORT,
    tlsCaCertPath: serverEnv.HAZEORIN_BACKEND_GRPC_CA_CERT_PATH,
    tlsServerName: serverEnv.HAZEORIN_BACKEND_GRPC_TLS_SERVER_NAME
  });

  return new serviceConstructor(
    serverEnv.HAZEORIN_BACKEND_GRPC_ADDR,
    transport.credentials,
    transport.options
  ) as UnaryClient;
}

export function getAuthClient() {
  if (!authClient) {
    const authPackage = getAuthServiceConstructor();
    authClient = createClient(
      (authPackage.v1 as Record<string, grpc.ServiceClientConstructor>).AuthService
    );
  }

  return authClient;
}

export function getApprovalFlowClient() {
  if (!approvalFlowClient) {
    const approvalFlowPackage = getApprovalFlowServiceConstructor();
    approvalFlowClient = createClient(
      (approvalFlowPackage.v1 as Record<string, grpc.ServiceClientConstructor>)
        .ApprovalFlowService
    );
  }

  return approvalFlowClient;
}

export function getReportingClient() {
  if (!reportingClient) {
    const reportingPackage = getReportingServiceConstructor();
    reportingClient = createClient(
      (reportingPackage.v1 as Record<string, grpc.ServiceClientConstructor>)
        .ReportingService
    );
  }

  return reportingClient;
}

export function getSubscriptionClient() {
  if (!subscriptionClient) {
    const subscriptionPackage = getSubscriptionServiceConstructor();
    subscriptionClient = createClient(
      (subscriptionPackage.v1 as Record<string, grpc.ServiceClientConstructor>)
        .SubscriptionService
    );
  }

  return subscriptionClient;
}

export function getTenantClient() {
  if (!tenantClient) {
    const tenantPackage = getTenantServiceConstructor();
    tenantClient = createClient(
      (tenantPackage.v1 as Record<string, grpc.ServiceClientConstructor>).TenantService
    );
  }

  return tenantClient;
}

export function createAuthenticatedMetadata(
  accessToken: string,
  extraHeaders?: Record<string, string | undefined>
) {
  const metadata = new grpc.Metadata();
  metadata.set("authorization", `Bearer ${accessToken}`);
  metadata.set("x-request-id", `admin-${randomUUID()}`);

  for (const [key, value] of Object.entries(extraHeaders ?? {})) {
    const normalizedValue = value?.trim();

    if (normalizedValue) {
      metadata.set(key, normalizedValue);
    }
  }

  return metadata;
}

export async function invokeUnary<TResponse>(
  client: UnaryClient,
  methodName: string,
  request: Record<string, unknown>,
  metadata = new grpc.Metadata()
) {
  return new Promise<TResponse>((resolve, reject) => {
    const method = client[methodName];

    if (typeof method !== "function") {
      reject(new Error(`Unknown gRPC method: ${methodName}`));
      return;
    }

    (method as (
      payload: Record<string, unknown>,
      meta: grpc.Metadata,
      callback: UnaryCallback<TResponse>
    ) => void).call(client, request, metadata, (error, response) => {
      if (error) {
        if (error.code === grpc.status.UNAUTHENTICATED) {
          reject(new GrpcUnauthenticatedError(error.details));
          return;
        }

        reject(new GrpcTransportError(error.details, error.code));
        return;
      }

      resolve(response);
    });
  });
}
