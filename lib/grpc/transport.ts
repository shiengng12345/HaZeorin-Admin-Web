import fs from "node:fs";

import * as grpc from "@grpc/grpc-js";

export type BackendGrpcTransportMode = "insecure" | "tls";

export type BackendGrpcTransportConfigInput = {
  address: string;
  transport: BackendGrpcTransportMode;
  tlsCaCertPath?: string;
  tlsServerName?: string;
};

type BackendGrpcTransportConfig = {
  credentials: grpc.ChannelCredentials;
  options?: grpc.ChannelOptions;
};

function stripKnownTargetPrefixes(target: string) {
  const trimmed = target.trim();

  if (trimmed.startsWith("unix:")) {
    return "localhost";
  }

  if (trimmed.startsWith("ipv4:") || trimmed.startsWith("ipv6:")) {
    return trimmed.slice(5);
  }

  return trimmed.replace(/^[a-z]+:\/\/\//i, "");
}

export function extractGrpcTargetHost(target: string) {
  const normalized = stripKnownTargetPrefixes(target);
  const withoutPath = normalized.split("/")[0];

  if (withoutPath.startsWith("[")) {
    const endIndex = withoutPath.indexOf("]");
    if (endIndex >= 0) {
      return withoutPath.slice(1, endIndex);
    }
  }

  const lastColonIndex = withoutPath.lastIndexOf(":");
  if (lastColonIndex < 0) {
    return withoutPath;
  }

  return withoutPath.slice(0, lastColonIndex);
}

export function isLoopbackGrpcTarget(target: string) {
  const host = extractGrpcTargetHost(target).toLowerCase();

  return (
    host === "localhost" ||
    host === "::1" ||
    host === "0:0:0:0:0:0:0:1" ||
    host.startsWith("127.")
  );
}

export function assertBackendGrpcTransportAllowed(
  payload: BackendGrpcTransportConfigInput
) {
  if (payload.transport === "tls") {
    return;
  }

  if (!isLoopbackGrpcTarget(payload.address)) {
    throw new Error(
      [
        `Remote insecure gRPC target is not allowed: ${payload.address}.`,
        "Use HAZEORIN_BACKEND_GRPC_TRANSPORT=tls for remote backends,",
        "or keep the backend bound to a local loopback/sidecar address."
      ].join(" ")
    );
  }
}

export function createBackendGrpcTransportConfig(
  payload: BackendGrpcTransportConfigInput
): BackendGrpcTransportConfig {
  assertBackendGrpcTransportAllowed(payload);

  if (payload.transport === "tls") {
    const rootCerts = payload.tlsCaCertPath?.trim()
      ? fs.readFileSync(payload.tlsCaCertPath.trim())
      : undefined;
    const options: grpc.ChannelOptions = {};
    const serverName = payload.tlsServerName?.trim();

    if (serverName) {
      options["grpc.ssl_target_name_override"] = serverName;
      options["grpc.default_authority"] = serverName;
    }

    return {
      credentials: grpc.credentials.createSsl(rootCerts),
      options
    };
  }

  return {
    credentials: grpc.credentials.createInsecure()
  };
}
