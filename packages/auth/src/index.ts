// Server-side exports
export { auth } from "./auth";
export type { Auth } from "./auth";

// RBAC helpers
export {
  requireAuth,
  requireOrgMembership,
  requireRole,
  requireOwner,
  requireAdminOrOwner,
  getActiveOrganization,
} from "./rbac";

// Permissions (shared between server and client)
export { ac, owner, admin, member, statement } from "./permissions";
