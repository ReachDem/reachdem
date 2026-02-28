"use server";

import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { MAPPINGS_PROMPT } from "@/lib/prompts/contacts";

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const standardMappingSchema = z.object({
  sourceColumns: z
    .array(z.string())
    .describe("Source column(s) that map to this field. Empty array if none."),
  transform: z
    .enum(["direct", "concat", "map_values", "none"])
    .describe("Transformation type: direct (1:1), concat, map_values, or none"),
  separator: z
    .string()
    .optional()
    .describe("Separator for concat transforms (e.g. ', ')"),
  valueMap: z
    .record(z.string(), z.string())
    .optional()
    .describe("Value mapping for map_values transforms (e.g. male → MALE)"),
  confidence: z
    .number()
    .describe("Confidence score 0.0–1.0. 0 if transform is 'none'."),
});

const suggestedCustomFieldSchema = z.object({
  sourceColumn: z.string().describe("Original column name from the import"),
  key: z.string().describe("snake_case key for the custom field"),
  label: z.string().describe("Human-readable label"),
  type: z
    .enum(["TEXT", "NUMBER", "DATE", "BOOLEAN", "URL", "SELECT"])
    .describe("Data type"),
  options: z
    .array(z.string())
    .optional()
    .describe("Possible values if type is SELECT"),
  reason: z.string().describe("Why this field is useful for the CRM"),
});

const rowValidationSchema = z.object({
  totalRows: z.number().describe("Total sample rows analyzed"),
  validRows: z.number().describe("Rows that would pass import validation"),
  invalidRows: z.number().describe("Rows that would fail import"),
  invalidRowIndices: z
    .array(z.number())
    .describe("0-based indices of invalid rows"),
  invalidReasons: z
    .array(z.string())
    .describe("Human-readable reasons for each invalid row"),
});

const mappingResultSchema = z.object({
  standardMappings: z
    .object({
      name: standardMappingSchema,
      phoneE164: standardMappingSchema,
      email: standardMappingSchema,
      gender: standardMappingSchema,
      birthdate: standardMappingSchema,
      address: standardMappingSchema,
      work: standardMappingSchema,
      enterprise: standardMappingSchema,
    })
    .describe("Mapping for each of the 8 standard ReachDem contact fields"),
  suggestedCustomFields: z
    .array(suggestedCustomFieldSchema)
    .describe("Up to 5 additional custom field proposals"),
  rowValidation: rowValidationSchema.describe("Row-level validation summary"),
  warnings: z
    .array(z.string())
    .describe("Warnings: ambiguous columns, bad formats, low coverage, etc."),
});

// ─── Public types ────────────────────────────────────────────────────────────

export type MappingResult = z.infer<typeof mappingResultSchema>;
export type StandardMapping = z.infer<typeof standardMappingSchema>;
export type SuggestedCustomField = z.infer<typeof suggestedCustomFieldSchema>;

export interface ExistingCustomField {
  key: string;
  label: string;
  type: "TEXT" | "NUMBER" | "DATE" | "BOOLEAN" | "URL" | "SELECT";
}

// ─── Main function ───────────────────────────────────────────────────────────

/**
 * Uses Gemini to intelligently map imported contact columns to the ReachDem schema.
 */
export async function generateContactMapping({
  columns,
  sampleData,
  existingCustomFields = [],
  sourceName,
}: {
  columns: string[];
  sampleData: Record<string, string>[];
  existingCustomFields?: ExistingCustomField[];
  sourceName?: string;
}): Promise<MappingResult> {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  });

  const { object } = await generateObject({
    model: google("gemini-2.5-flash"),
    schema: mappingResultSchema,
    system: MAPPINGS_PROMPT,
    prompt: [
      `sampleRows: ${JSON.stringify(sampleData)}`,
      sourceName ? `sourceName: ${sourceName}` : "",
      `existingCustomFields: ${JSON.stringify(existingCustomFields)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return object;
}
