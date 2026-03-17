import type { FieldErrors, Resolver } from "react-hook-form";
import * as z from "zod";

function setNestedError(
  errors: Record<string, unknown>,
  path: (string | number)[],
  issue: z.ZodIssue
) {
  const normalizedPath = path.length > 0 ? path.map(String) : ["root"];
  let current = errors;

  for (const [index, segment] of normalizedPath.entries()) {
    if (index === normalizedPath.length - 1) {
      current[segment] = {
        type: issue.code,
        message: issue.message,
      };
      return;
    }

    if (
      typeof current[segment] !== "object" ||
      current[segment] === null ||
      Array.isArray(current[segment])
    ) {
      current[segment] = {};
    }

    current = current[segment] as Record<string, unknown>;
  }
}

export function zodFormResolver<TSchema extends z.ZodTypeAny>(
  schema: TSchema
): Resolver<z.infer<TSchema>> {
  return async (values) => {
    const parsed = await schema.safeParseAsync(values);

    if (parsed.success) {
      return {
        values: parsed.data as z.infer<TSchema>,
        errors: {} as FieldErrors<z.infer<TSchema>>,
      };
    }

    const errors: Record<string, unknown> = {};

    for (const issue of parsed.error.issues) {
      setNestedError(errors, issue.path, issue);
    }

    return {
      values: {} as z.infer<TSchema>,
      errors: errors as FieldErrors<z.infer<TSchema>>,
    };
  };
}
