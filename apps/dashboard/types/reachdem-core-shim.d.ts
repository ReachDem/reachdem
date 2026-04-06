declare module "@reachdem/core" {
  export class BillingCatalogService {
    static normalizePlanCode(
      planCode?: string | null
    ): "free" | "basic" | "growth" | "pro" | "custom";
  }

  export function classifyError(errorCode: string): "retryable" | "final";
  export function getDownloadPresignedUrl(
    key: string,
    expiresIn?: number
  ): Promise<string>;
}
