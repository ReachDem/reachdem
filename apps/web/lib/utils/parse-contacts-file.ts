import * as XLSX from "xlsx";

const VCF_RICH_PAYLOAD_KEY = "__vcfRichPayload";

type VcfRichItem = {
  value: string;
  types: string[];
  isPreferred: boolean;
};

type VcfAddress = {
  value: string;
  poBox: string;
  extended: string;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  types: string[];
  isPreferred: boolean;
};

type VcfOrganization = {
  value: string;
  parts: string[];
};

type VcfRichPayload = {
  vcfPhones?: VcfRichItem[];
  vcfEmails?: VcfRichItem[];
  vcfUrls?: string[];
  vcfTitle?: string;
  vcfRole?: string;
  vcfNote?: string;
  vcfNickname?: string;
  vcfBirthday?: string;
  vcfCategories?: string[];
  vcfAddresses?: VcfAddress[];
  vcfOrganization?: VcfOrganization;
};

type ParsedVcfProperty = {
  key: string;
  params: Record<string, string[]>;
  value: string;
};

export interface ParsedFileResult {
  columns: string[];
  rows: Record<string, string>[];
  totalRows: number;
  fileName: string;
}

function getFileExtension(fileName: string): string {
  const lastDotIndex = fileName.lastIndexOf(".");
  return lastDotIndex >= 0
    ? fileName.substring(lastDotIndex).toLowerCase()
    : "";
}

function parseSpreadsheetFile(
  file: File,
  buffer: ArrayBuffer
): ParsedFileResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Le fichier ne contient aucune feuille de calcul.");
  }

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Impossible de lire la feuille de calcul.");
  }

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rawRows.length === 0) {
    throw new Error("Le fichier est vide ou ne contient pas de donnees.");
  }

  const columns = Object.keys(rawRows[0]!);
  const rows = rawRows.map((row) => {
    const stringRow: Record<string, string> = {};
    for (const col of columns) {
      const val = row[col];
      stringRow[col] = val != null ? String(val).trim() : "";
    }
    return stringRow;
  });

  return {
    columns,
    rows,
    totalRows: rows.length,
    fileName: file.name,
  };
}

function decodeQuotedPrintable(value: string): string {
  const softBreakNormalized = value.replace(/=\r?\n/g, "");
  const bytes: number[] = [];

  for (let i = 0; i < softBreakNormalized.length; i += 1) {
    const char = softBreakNormalized[i];
    if (char === "=" && i + 2 < softBreakNormalized.length) {
      const hex = softBreakNormalized.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
        bytes.push(parseInt(hex, 16));
        i += 2;
        continue;
      }
    }

    bytes.push(char.charCodeAt(0));
  }

  return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
}

function decodeBase64(value: string): string {
  try {
    const binary = atob(value.replace(/\s+/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return value;
  }
}

function decodeVcfTextValue(
  value: string,
  params: Record<string, string[]>
): string {
  const encodingValues = params.ENCODING ?? [];
  const normalizedEncoding = encodingValues.map((entry) => entry.toLowerCase());

  let decoded = value;
  if (
    normalizedEncoding.includes("quoted-printable") ||
    normalizedEncoding.includes("q")
  ) {
    decoded = decodeQuotedPrintable(decoded);
  } else if (
    normalizedEncoding.includes("b") ||
    normalizedEncoding.includes("base64")
  ) {
    decoded = decodeBase64(decoded);
  }

  return decoded
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function unfoldVcfLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const unfolded: string[] = [];

  for (const line of lines) {
    if (
      (line.startsWith(" ") || line.startsWith("\t")) &&
      unfolded.length > 0
    ) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  return unfolded;
}

function parseVcfLine(line: string): ParsedVcfProperty | null {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex < 0) {
    return null;
  }

  const rawName = line.slice(0, separatorIndex).trim();
  const rawValue = line.slice(separatorIndex + 1);
  if (!rawName) {
    return null;
  }

  const nameParts = rawName.split(";");
  const key = nameParts[0]!.toUpperCase();
  const params: Record<string, string[]> = {};

  for (const part of nameParts.slice(1)) {
    if (!part) continue;

    const [rawParamKey, ...rawParamValueParts] = part.split("=");
    if (!rawParamKey) continue;

    const paramKey = rawParamKey.toUpperCase();
    const rawParamValue =
      rawParamValueParts.length > 0
        ? rawParamValueParts.join("=")
        : rawParamKey;
    const values = rawParamValue
      .split(",")
      .map((entry) => entry.trim().replace(/^"(.*)"$/, "$1"))
      .filter(Boolean);

    params[paramKey] = values;
  }

  return {
    key,
    params,
    value: decodeVcfTextValue(rawValue, params),
  };
}

function isTruthyPreferredValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function getPreferenceRank(item: VcfRichItem | VcfAddress): number {
  return item.isPreferred ? 0 : 1;
}

function getTypeRank(types: string[], order: string[]): number {
  for (let index = 0; index < order.length; index += 1) {
    if (types.includes(order[index]!)) {
      return index;
    }
  }

  return order.length;
}

function pickBestRichItem(
  items: VcfRichItem[],
  preferredTypeOrder: string[]
): VcfRichItem | undefined {
  return [...items].sort((left, right) => {
    const preferenceDelta = getPreferenceRank(left) - getPreferenceRank(right);
    if (preferenceDelta !== 0) {
      return preferenceDelta;
    }

    const typeDelta =
      getTypeRank(left.types, preferredTypeOrder) -
      getTypeRank(right.types, preferredTypeOrder);
    if (typeDelta !== 0) {
      return typeDelta;
    }

    return 0;
  })[0];
}

function pickBestAddress(addresses: VcfAddress[]): VcfAddress | undefined {
  return [...addresses].sort((left, right) => {
    const preferenceDelta = getPreferenceRank(left) - getPreferenceRank(right);
    if (preferenceDelta !== 0) {
      return preferenceDelta;
    }

    const typeDelta =
      getTypeRank(left.types, ["work", "home"]) -
      getTypeRank(right.types, ["work", "home"]);
    if (typeDelta !== 0) {
      return typeDelta;
    }

    return 0;
  })[0];
}

function parseVcfStructuredName(value: string): string {
  const [lastName, firstName, middleName, prefix, suffix] = value
    .split(";")
    .map((part) => part.trim())
    .slice(0, 5);

  return [prefix, firstName, middleName, lastName, suffix]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeRichValue(property: ParsedVcfProperty): {
  value: string;
  types: string[];
  isPreferred: boolean;
} {
  const rawTypes = [
    ...(property.params.TYPE ?? []),
    ...Object.keys(property.params).filter((key) => key !== "TYPE"),
  ];
  const types = Array.from(
    new Set(rawTypes.map((entry) => entry.toLowerCase()).filter(Boolean))
  );
  const isPreferred =
    property.params.PREF?.some(isTruthyPreferredValue) ??
    types.includes("pref");

  return {
    value: property.value.trim(),
    types,
    isPreferred,
  };
}

function parseVcfAddress(property: ParsedVcfProperty): VcfAddress {
  const richValue = normalizeRichValue(property);
  const [poBox, extended, street, city, region, postalCode, country] =
    property.value
      .split(";")
      .map((part) => part.trim())
      .slice(0, 7);
  const formattedValue = [street, extended, city, region, postalCode, country]
    .filter(Boolean)
    .join(", ")
    .trim();

  return {
    value: formattedValue,
    poBox: poBox ?? "",
    extended: extended ?? "",
    street: street ?? "",
    city: city ?? "",
    region: region ?? "",
    postalCode: postalCode ?? "",
    country: country ?? "",
    types: richValue.types,
    isPreferred: richValue.isPreferred,
  };
}

function cleanObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry == null) return false;
      if (typeof entry === "string") return entry.trim().length > 0;
      if (Array.isArray(entry)) return entry.length > 0;
      return true;
    })
  ) as T;
}

function parseVcfText(text: string): Record<string, string>[] {
  const lines = unfoldVcfLines(text);
  const cards: ParsedVcfProperty[][] = [];
  let currentCard: ParsedVcfProperty[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.toUpperCase() === "BEGIN:VCARD") {
      currentCard = [];
      continue;
    }

    if (trimmed.toUpperCase() === "END:VCARD") {
      if (currentCard) {
        cards.push(currentCard);
      }
      currentCard = null;
      continue;
    }

    if (!currentCard) {
      continue;
    }

    const parsedLine = parseVcfLine(line);
    if (parsedLine) {
      currentCard.push(parsedLine);
    }
  }

  const rows = cards
    .map((card) => {
      let formattedName = "";
      let structuredName = "";
      let organization: VcfOrganization | undefined;
      const emails: VcfRichItem[] = [];
      const phones: VcfRichItem[] = [];
      const addresses: VcfAddress[] = [];
      const urls: string[] = [];
      let title = "";
      let role = "";
      let note = "";
      let nickname = "";
      let birthday = "";
      const categories: string[] = [];

      for (const property of card) {
        switch (property.key) {
          case "FN":
            formattedName = property.value;
            break;
          case "N":
            structuredName = parseVcfStructuredName(property.value);
            break;
          case "EMAIL":
            if (property.value.trim()) {
              emails.push(normalizeRichValue(property));
            }
            break;
          case "TEL":
            if (property.value.trim()) {
              phones.push(normalizeRichValue(property));
            }
            break;
          case "ORG": {
            const parts = property.value
              .split(";")
              .map((part) => part.trim())
              .filter(Boolean);
            if (parts.length > 0) {
              organization = {
                value: parts.join(" / "),
                parts,
              };
            }
            break;
          }
          case "TITLE":
            title = property.value;
            break;
          case "ROLE":
            role = property.value;
            break;
          case "NOTE":
            note = property.value;
            break;
          case "NICKNAME":
            nickname = property.value;
            break;
          case "BDAY":
            birthday = property.value;
            break;
          case "URL":
            if (property.value) {
              urls.push(property.value);
            }
            break;
          case "CATEGORIES":
            categories.push(
              ...property.value
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean)
            );
            break;
          case "ADR":
            addresses.push(parseVcfAddress(property));
            break;
          default:
            break;
        }
      }

      const bestEmail = pickBestRichItem(emails, ["work", "home"]);
      const bestPhone = pickBestRichItem(phones, ["cell", "work", "home"]);
      const bestAddress = pickBestAddress(addresses);
      const displayName = formattedName || structuredName;

      const richPayload = cleanObject<VcfRichPayload>({
        vcfPhones: phones,
        vcfEmails: emails,
        vcfUrls: urls,
        vcfTitle: title,
        vcfRole: role,
        vcfNote: note,
        vcfNickname: nickname,
        vcfBirthday: birthday,
        vcfCategories: categories,
        vcfAddresses: addresses,
        vcfOrganization: organization,
      });

      const row = cleanObject<Record<string, string>>({
        name: displayName,
        email: bestEmail?.value ?? "",
        phone: bestPhone?.value ?? "",
        enterprise: organization?.value ?? "",
        work: title,
        address: bestAddress?.value ?? "",
      });

      if (Object.keys(richPayload).length > 0) {
        row[VCF_RICH_PAYLOAD_KEY] = JSON.stringify(richPayload);
      }

      return row;
    })
    .filter((row) =>
      Object.entries(row).some(
        ([key, value]) => key.startsWith("__") || value.trim().length > 0
      )
    );

  if (rows.length === 0) {
    throw new Error("Le fichier VCF est vide ou ne contient aucun contact.");
  }

  return rows;
}

function parseVcfFile(file: File, text: string): ParsedFileResult {
  const rows = parseVcfText(text);
  const visibleColumns = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row)
        .filter((key) => !key.startsWith("__"))
        .forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  return {
    columns: visibleColumns,
    rows,
    totalRows: rows.length,
    fileName: file.name,
  };
}

export async function parseContactFile(file: File): Promise<ParsedFileResult> {
  const extension = getFileExtension(file.name);

  if (extension === ".vcf") {
    const text = await file.text();
    return parseVcfFile(file, text);
  }

  const buffer = await file.arrayBuffer();
  return parseSpreadsheetFile(file, buffer);
}

export function getSampleData(
  rows: Record<string, string>[],
  maxSamples = 5
): Record<string, string>[] {
  const nonEmptyRows = rows.filter((row) =>
    Object.entries(row).some(
      ([key, value]) => !key.startsWith("__") && value !== ""
    )
  );
  return nonEmptyRows.slice(0, maxSamples);
}

export function getVcfRichPayload(
  row: Record<string, string>
): VcfRichPayload | null {
  const payload = row[VCF_RICH_PAYLOAD_KEY];
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload) as VcfRichPayload;
  } catch {
    return null;
  }
}

export function isValidContactFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const allowedTypes = [
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/vcard",
    "text/x-vcard",
    "text/directory",
    "application/vcard",
    "application/x-vcard",
  ];

  const allowedExtensions = [".csv", ".xlsx", ".xls", ".vcf"];
  const extension = getFileExtension(file.name);

  if (
    !allowedTypes.includes(file.type) &&
    !allowedExtensions.includes(extension)
  ) {
    return {
      valid: false,
      error: "Format non supporte. Utilisez un fichier CSV, XLSX, XLS ou VCF.",
    };
  }

  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: "Le fichier est trop volumineux (max 10 Mo).",
    };
  }

  return { valid: true };
}

export { parseVcfText };
