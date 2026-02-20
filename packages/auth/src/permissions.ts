import { createAccessControl } from "better-auth/plugins/access";
import {
    defaultStatements,
    adminAc,
    memberAc,
    ownerAc,
} from "better-auth/plugins/organization/access";

/**
 * Custom permission statements for the ReachDem platform.
 * Extends Better Auth's default org statements with workspace-specific resources.
 *
 * Use `as const` so TypeScript can infer the exact string literal types.
 */
export const statement = {
    ...defaultStatements,
    workspace: ["create", "read", "update", "delete"],
    proposal: ["create", "read", "update", "delete", "send"],
    link: ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

/**
 * Role definitions – extend default Better Auth org roles with custom resource permissions.
 */
export const owner = ac.newRole({
    workspace: ["create", "read", "update", "delete"],
    proposal: ["create", "read", "update", "delete", "send"],
    link: ["create", "read", "update", "delete"],
    ...ownerAc.statements,
});

export const admin = ac.newRole({
    workspace: ["create", "read", "update"],
    proposal: ["create", "read", "update", "send"],
    link: ["create", "read", "update", "delete"],
    ...adminAc.statements,
});

export const member = ac.newRole({
    workspace: ["read"],
    proposal: ["create", "read", "update", "send"],
    link: ["create", "read", "update"],
    ...memberAc.statements,
});
