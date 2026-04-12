import { NextRequest, NextResponse } from "next/server";
import { auth } from "./auth";
import { authenticateApiKey } from "./api-key";

export type AuthenticatedContext<TParams = Record<string, string | string[]>> =
  {
    req: NextRequest;
    params: TParams;
    userId: string;
    organizationId: string;
    authType: "session" | "api_key";
    apiKeyId: string | null;
  };

async function resolveSessionWorkspace(req: NextRequest) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return null;
  }

  const organizationId = session.session.activeOrganizationId;

  if (!organizationId) {
    return {
      error: NextResponse.json(
        { error: "Workspace required" },
        { status: 403 }
      ),
    };
  }

  return {
    userId: session.user.id,
    organizationId,
    authType: "session" as const,
    apiKeyId: null,
  };
}

async function resolvePublicWorkspace(req: NextRequest) {
  const authorization = req.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const apiKey = await authenticateApiKey(authorization.slice(7));

    if (!apiKey) {
      return {
        error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    return {
      ...apiKey,
      authType: "api_key" as const,
    };
  }

  return resolveSessionWorkspace(req);
}

export function withWorkspace<TParams = Record<string, string | string[]>>(
  handler: (
    context: AuthenticatedContext<TParams>
  ) => Promise<NextResponse<any> | Response> | NextResponse<any> | Response
) {
  return async (req: NextRequest, context: { params: Promise<TParams> }) => {
    const sessionContext = await resolveSessionWorkspace(req);

    if (!sessionContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ("error" in sessionContext) {
      return sessionContext.error;
    }

    const params = context?.params ? await context.params : ({} as TParams);

    return handler({
      req,
      params,
      userId: sessionContext.userId,
      organizationId: sessionContext.organizationId,
      authType: sessionContext.authType,
      apiKeyId: sessionContext.apiKeyId,
    });
  };
}

export function withPublicWorkspace<
  TParams = Record<string, string | string[]>,
>(
  handler: (
    context: AuthenticatedContext<TParams>
  ) => Promise<NextResponse<any> | Response> | NextResponse<any> | Response
) {
  return async (req: NextRequest, context: { params: Promise<TParams> }) => {
    const publicContext = await resolvePublicWorkspace(req);

    if (!publicContext) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ("error" in publicContext) {
      return publicContext.error;
    }

    const params = context?.params ? await context.params : ({} as TParams);

    return handler({
      req,
      params,
      userId: publicContext.userId,
      organizationId: publicContext.organizationId,
      authType: publicContext.authType,
      apiKeyId: publicContext.apiKeyId,
    });
  };
}
