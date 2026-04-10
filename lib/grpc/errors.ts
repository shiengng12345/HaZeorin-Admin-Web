import { status as grpcStatus } from "@grpc/grpc-js";

export class GrpcTransportError extends Error {
  code: number;

  constructor(message: string, code: number) {
    super(message);
    this.name = "GrpcTransportError";
    this.code = code;
  }
}

export class GrpcUnauthenticatedError extends GrpcTransportError {
  constructor(message: string) {
    super(message, grpcStatus.UNAUTHENTICATED);
    this.name = "GrpcUnauthenticatedError";
  }
}

export class GrpcBusinessError extends Error {
  status: string;

  constructor(message: string, status: string) {
    super(message);
    this.name = "GrpcBusinessError";
    this.status = status;
  }
}

export function isGrpcUnauthenticatedError(
  error: unknown
): error is GrpcUnauthenticatedError {
  return error instanceof GrpcUnauthenticatedError;
}
