import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  ApiIdempotencyService,
  ApiKeyService,
  PublicApiError,
  toPublicApiErrorResponse,
  type ApiRequestContext,
} from "@reachdem/core";

type PublicApiHandler<TParams = Record<string, string>> = (input: {
  req: NextRequest;
  context: ApiRequestContext;
  params: TParams;
}) => Promise<NextResponse> | NextResponse;

type PublicApiOptions = {
  requiredScopes?: string[];
  idempotency?: {
    enabled?: boolean;
    required?: boolean;
    ttlSeconds?: number;
  };
};

function jsonError(error: PublicApiError, requestId: string) {
  return NextResponse.json(
    {
      ...toPublicApiErrorResponse(error),
      request_id: requestId,
    },
    { status: error.status }
  );
}

async function responseBodyForStorage(response: NextResponse) {
  const text = await response.clone().text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export function withApiKeyAuth<TParams = Record<string, string>>(
  handler: PublicApiHandler<TParams>,
  options: PublicApiOptions = {}
) {
  return async (
    req: NextRequest,
    routeContext?: { params?: TParams | Promise<TParams> }
  ) => {
    const startedAt = Date.now();
    const requestId = req.headers.get("x-request-id") ?? randomUUID();
    let apiContext: ApiRequestContext | null = null;
    let status = 500;
    let idempotencyRecordId: string | null = null;

    try {
      const authContext = await ApiKeyService.authenticate(
        req.headers.get("authorization"),
        options.requiredScopes ?? []
      );
      apiContext = { ...authContext, requestId };

      const shouldUseIdempotency =
        options.idempotency?.enabled === true &&
        !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());

      if (shouldUseIdempotency) {
        const rawBody = await req.clone().text();
        const begin = await ApiIdempotencyService.begin({
          organizationId: apiContext.organizationId,
          apiKeyId: apiContext.apiKeyId,
          idempotencyKey: req.headers.get("idempotency-key"),
          method: req.method,
          path: req.nextUrl.pathname,
          rawBody,
          ttlSeconds: options.idempotency?.ttlSeconds,
        });

        if (begin.kind === "replay") {
          status = begin.responseStatus;
          return NextResponse.json(begin.responseBody, {
            status: begin.responseStatus,
          });
        }

        idempotencyRecordId = begin.recordId;
      } else if (options.idempotency?.required === true) {
        throw new PublicApiError(
          "missing_idempotency_key",
          "Idempotency-Key header is required",
          400
        );
      }

      const params = routeContext?.params
        ? await routeContext.params
        : ({} as TParams);
      const response = await handler({ req, context: apiContext, params });
      status = response.status;

      if (idempotencyRecordId) {
        await ApiIdempotencyService.complete(
          idempotencyRecordId,
          response.status,
          await responseBodyForStorage(response)
        );
      }

      return response;
    } catch (error) {
      if (idempotencyRecordId) {
        await ApiIdempotencyService.fail(idempotencyRecordId);
      }

      if (error instanceof PublicApiError) {
        status = error.status;
        return jsonError(error, requestId);
      }

      console.error("[Public API] Unhandled error", error);
      const internalError = new PublicApiError(
        "internal_error",
        "Internal server error",
        500
      );
      return jsonError(internalError, requestId);
    } finally {
      const durationMs = Date.now() - startedAt;
      console.info("[Public API]", {
        request_id: requestId,
        method: req.method,
        path: req.nextUrl.pathname,
        organization_id: apiContext?.organizationId ?? null,
        api_key_prefix: apiContext?.keyPrefix ?? null,
        status,
        duration_ms: durationMs,
      });
    }
  };
}
