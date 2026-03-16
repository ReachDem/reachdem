declare var process: {
  env: Record<string, string | undefined>;
};

declare var Buffer: {
  from(input: string): { toString(encoding?: string): string };
};

declare module "crypto" {
  export function randomUUID(): string;
  export function createHash(algorithm: string): {
    update(input: string): { digest(encoding: string): string };
    digest(encoding: string): string;
  };
  export function timingSafeEqual(
    a: Uint8Array | { length: number },
    b: Uint8Array | { length: number }
  ): boolean;
}

declare module "node:module" {
  export function createRequire(url: string): (id: string) => unknown;
}

declare module "nodemailer";
