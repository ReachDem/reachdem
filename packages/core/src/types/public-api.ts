export type ApiRequestContext = {
  requestId: string;
  organizationId: string;
  apiKeyId: string;
  keyPrefix: string;
  scopes: string[];
};
