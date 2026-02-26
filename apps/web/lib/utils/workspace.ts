import { NextRequest, NextResponse } from "next/server";
import { auth } from "@reachdem/auth";
import { headers } from "next/headers";

export type AuthenticatedContext<TParams = Record<string, string | string[]>> = {
    req: NextRequest;
    params: TParams;
    userId: string;
    organizationId: string;
};

export function withWorkspace<TParams = Record<string, string | string[]>>(
    handler: (context: AuthenticatedContext<TParams>) => Promise<NextResponse> | NextResponse
) {
    return async (req: NextRequest, context: { params: Promise<TParams> }) => {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const organizationId = session.session.activeOrganizationId;

        if (!organizationId) {
            return NextResponse.json({ error: "Workspace required" }, { status: 403 });
        }

        const params = context?.params ? await context.params : ({} as TParams);

        return handler({
            req,
            params,
            userId: session.user.id,
            organizationId,
        });
    };
}
