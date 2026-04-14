type JsonValue = Record<string, unknown>;

export class RedisCacheClient {
  private static get baseUrl(): string | null {
    return (
      process.env.UPSTASH_REDIS_REST_URL ?? process.env.REDIS_REST_URL ?? null
    );
  }

  private static get token(): string | null {
    return (
      process.env.UPSTASH_REDIS_REST_TOKEN ??
      process.env.REDIS_REST_TOKEN ??
      null
    );
  }

  private static get enabled(): boolean {
    return Boolean(this.baseUrl && this.token);
  }

  private static async request<T>(path: string): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });

      if (!response.ok) return null;
      return (await response.json()) as T;
    } catch {
      return null;
    }
  }

  static async get<T extends JsonValue>(key: string): Promise<T | null> {
    const payload = await this.request<{ result?: T | null }>(
      `/get/${encodeURIComponent(key)}`
    );
    return payload?.result ?? null;
  }

  static async set(
    key: string,
    value: JsonValue,
    ttlSeconds: number
  ): Promise<void> {
    if (!this.enabled) return;

    try {
      await fetch(
        `${this.baseUrl}/set/${encodeURIComponent(key)}/${encodeURIComponent(
          JSON.stringify(value)
        )}?EX=${ttlSeconds}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      );
    } catch {
      // Cache must never break the request path.
    }
  }

  static async del(key: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await fetch(`${this.baseUrl}/del/${encodeURIComponent(key)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      });
    } catch {
      // Cache must never break the request path.
    }
  }
}
