export function getPostHogPublicToken(): string | null {
  return (
    process.env.NEXT_PUBLIC_POSTHOG_TOKEN ??
    process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN ??
    null
  );
}

export function getPostHogHost(): string | null {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST ?? null;
}
