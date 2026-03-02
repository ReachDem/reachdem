import type { MappingResult, StandardMapping } from "./ai-mapping";

export const STANDARD_FIELDS: {
  key: keyof MappingResult["standardMappings"];
  label: string;
  required?: boolean;
}[] = [
  { key: "name", label: "Name", required: true },
  { key: "phoneE164", label: "Phone"},
  { key: "email", label: "Email"},
  { key: "gender", label: "Gender" },
  { key: "birthdate", label: "Birthdate" },
  { key: "address", label: "Address" },
  { key: "work", label: "Job Title" },
  { key: "enterprise", label: "Enterprise" },
];

export function applyMapping(
  mapping: StandardMapping,
  sourceRow: Record<string, string>,
): string {
  if (mapping.transform === "none" || mapping.sourceColumns.length === 0)
    return "";

  if (mapping.transform === "concat") {
    return mapping.sourceColumns
      .map((col) => sourceRow[col]?.trim())
      .filter(Boolean)
      .join(mapping.separator || " ");
  }

  if (mapping.transform === "map_values") {
    const raw = sourceRow[mapping.sourceColumns[0]] || "";
    if (mapping.valueMap) {
      const lower = raw.toLowerCase().trim();
      return mapping.valueMap[lower] || mapping.valueMap[raw] || raw;
    }
    return raw;
  }

  // "direct"
  return sourceRow[mapping.sourceColumns[0]] || "";
}
