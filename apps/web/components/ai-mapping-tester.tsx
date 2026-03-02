"use client";

import * as React from "react";
import { useState } from "react";
import {
  IconWand,
  IconLoader2,
  IconAlertCircle,
  IconArrowDown,
  IconCheck,
  IconEdit,
  IconPlus,
  IconDownload,
} from "@tabler/icons-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  parseContactFile,
  getSampleData,
  isValidContactFile,
} from "@/lib/utils/parse-contacts-file";
import {
  generateContactMapping,
  MappingResult,
  StandardMapping,
} from "@/lib/utils/ai-mapping";
import { STANDARD_FIELDS, applyMapping } from "@/lib/utils/ai-mapping-client";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export function AiMappingTester() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MappingResult | null>(null);
  const [sampleData, setSampleData] = useState<Record<string, string>[]>([]);
  const [allParsedRows, setAllParsedRows] = useState<Record<string, string>[]>(
    [],
  );
  const [columns, setColumns] = useState<string[]>([]);
  const [manualOverrides, setManualOverrides] = useState<
    Record<string, string>
  >({});
  const [isEditing, setIsEditing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const validation = isValidContactFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || "Invalid file");
      return;
    }
    setFile(selectedFile);
    setError(null);
    setResult(null);
    setSampleData([]);
    setAllParsedRows([]);
    setColumns([]);
    setManualOverrides({});
    setIsEditing(false);
  };

  const runMapping = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const parsed = await parseContactFile(file);
      const sample = getSampleData(parsed.rows, 5);
      setColumns(parsed.columns);
      setAllParsedRows(parsed.rows);
      setSampleData(sample);
      const mappingResult = await generateContactMapping({
        columns: parsed.columns,
        sampleData: sample,
        existingCustomFields: [],
        sourceName: file.name,
      });
      console.log(
        "[AI Mapping Result]",
        JSON.stringify(mappingResult, null, 2),
      );
      setResult(mappingResult);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Mapping failed.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Compute active (non-ignored) custom fields and their effective labels
  const displayCustomFields = React.useMemo(() => {
    if (!result) return [];

    // Start with all AI suggestions
    const aiFields = result.suggestedCustomFields.slice(0, 5).map((cf) => ({
      key: cf.key,
      label: cf.label,
      originalSource: cf.sourceColumn,
      type: cf.type,
    }));

    // Add any manual overrides that aren't in the AI suggestions
    Object.entries(manualOverrides).forEach(([key, val]) => {
      if (
        key.startsWith("custom_") &&
        val !== "__unmapped" &&
        !aiFields.some((f) => f.key === key)
      ) {
        aiFields.push({
          key,
          label: val, // use column name as label
          originalSource: val,
          type: "TEXT",
        });
      }
    });

    return aiFields
      .map((cf) => {
        const override = manualOverrides[cf.key];
        const currentSource = override || cf.originalSource;

        return {
          ...cf,
          currentSource,
          // If the user picked a different column, update the label to match
          displayLabel:
            override && override !== cf.originalSource ? override : cf.label,
          isIgnored: currentSource === "__unmapped",
        };
      })
      .filter((cf) => !cf.isIgnored); // Only show non-ignored columns
  }, [result, manualOverrides]);

  // Build mapped rows from source data using the AI result and manual overrides
  const mappedRows = React.useMemo(() => {
    if (!result || !sampleData.length) return [];
    return sampleData.map((sourceRow) => {
      const row: Record<string, string> = {};
      for (const field of STANDARD_FIELDS) {
        const override = manualOverrides[field.key];
        if (override) {
          if (override === "__unmapped") {
            row[field.key] = "";
          } else {
            row[field.key] = sourceRow[override] || "";
          }
        } else {
          row[field.key] = applyMapping(
            result.standardMappings[field.key],
            sourceRow,
          );
        }
      }
      for (const cf of displayCustomFields) {
        row[cf.key] = sourceRow[cf.currentSource] || "";
      }
      return row;
    });
  }, [result, sampleData, manualOverrides, displayCustomFields]);

  const addCustomColumn = (colName: string) => {
    const aiSuggestion = result?.suggestedCustomFields.find(
      (f) => f.sourceColumn === colName,
    );
    const key = aiSuggestion ? aiSuggestion.key : `custom_${colName}`;

    setManualOverrides((prev) => ({
      ...prev,
      [key]: colName,
    }));
  };

  const getUnusedColumns = () => {
    if (!result) return [];

    // Get columns used in standard mappings
    const usedStandard = new Set<string>();
    for (const field of STANDARD_FIELDS) {
      const mapping = result.standardMappings[field.key];
      const override = manualOverrides[field.key];

      if (override && override !== "__unmapped" && override !== "__concat") {
        usedStandard.add(override);
      } else if (!override && mapping.transform !== "none") {
        mapping.sourceColumns.forEach((c) => usedStandard.add(c));
      }
    }

    // Get columns used in custom fields
    const usedCustom = new Set(displayCustomFields.map((f) => f.currentSource));

    return columns.filter((c) => !usedStandard.has(c) && !usedCustom.has(c));
  };

  const handleDownloadJSON = () => {
    if (!result || !allParsedRows.length) return;

    // Map all rows using the active configuration
    const fullMappedData = allParsedRows.map((sourceRow) => {
      const row: Record<string, string> = {};

      // Map standard fields
      for (const field of STANDARD_FIELDS) {
        const override = manualOverrides[field.key];
        if (override) {
          if (override === "__unmapped") {
            row[field.key] = "";
          } else {
            row[field.key] = sourceRow[override] || "";
          }
        } else {
          row[field.key] = applyMapping(
            result.standardMappings[field.key],
            sourceRow,
          );
        }
      }

      // Map custom fields
      for (const cf of displayCustomFields) {
        row[cf.key] = sourceRow[cf.currentSource] || "";
      }
      return row;
    });

    // Create and trigger download
    const blob = new Blob([JSON.stringify(fullMappedData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapped_contacts_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-dashed border-primary/50 text-primary hover:text-primary"
          aria-label="Open AI mapping tester"
        >
          <IconWand className="size-4" aria-hidden="true" />
          Test AI Mapping (Dev)
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-w-5xl lg:max-w-6xl xl:max-w-[1400px] w-[95vw] flex flex-col p-0"
        style={{ maxHeight: "90vh" }}
      >
        <DialogHeader className="p-6 pb-2 shrink-0 border-b">
          <DialogTitle>AI Field Mapping — Powered by Gemini</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6 flex flex-col gap-6">
          {/* Controls */}
          <div className="flex items-end gap-4 shrink-0 mt-2">
            <div className="flex-1 space-y-2">
              <label htmlFor="file-upload" className="text-sm font-medium">
                Load a CSV or Excel file to preview data mapping
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <Button onClick={runMapping} disabled={!file || loading}>
              {loading ? (
                <IconLoader2 className="size-4 mr-2 animate-spin" />
              ) : (
                <IconWand className="size-4 mr-2" />
              )}
              {loading ? "Gemini is mapping…" : "Map with Gemini"}
            </Button>
          </div>

          {error && (
            <div
              className="rounded-md bg-destructive/15 p-3 flex items-start gap-2 text-destructive text-sm"
              role="alert"
            >
              <IconAlertCircle className="size-4 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {result && sampleData.length > 0 && (
            <div className="flex flex-col gap-6">
              {/* Table 1: Source Data */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base">
                    Original Source Data
                  </h3>
                  <Badge
                    variant="secondary"
                    className="font-normal font-mono tabular-nums"
                  >
                    {sampleData.length} records
                  </Badge>
                </div>
                <div className="rounded-md border overflow-x-auto shadow-sm">
                  <Table className="text-sm">
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead
                            key={col}
                            className="whitespace-nowrap font-medium text-foreground"
                          >
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sampleData.map((row, i) => (
                        <TableRow key={i}>
                          {columns.map((col) => (
                            <TableCell
                              key={col}
                              className="whitespace-nowrap tabular-nums"
                            >
                              {row[col] || (
                                <span className="text-muted-foreground italic opacity-50">
                                  —
                                </span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center shrink-0">
                <div className="bg-muted p-2 rounded-full ring-4 ring-background">
                  <IconArrowDown className="size-5 text-muted-foreground" />
                </div>
              </div>

              {/* Warnings */}
              {result.warnings.length > 0 && (
                <div className="rounded-md bg-amber-500/10 p-3 flex items-start gap-2 text-amber-700 dark:text-amber-400 text-sm">
                  <IconAlertCircle className="size-4 mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold">Warnings</span>
                    <ul className="list-disc pl-4 space-y-0.5 opacity-90">
                      {result.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Row validation summary */}
              {result.rowValidation.invalidRows > 0 && (
                <div className="rounded-md bg-destructive/10 p-3 flex items-start gap-2 text-destructive text-sm">
                  <IconAlertCircle className="size-4 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold">
                      {result.rowValidation.invalidRows} /{" "}
                      {result.rowValidation.totalRows} rows would fail import
                    </span>
                    {result.rowValidation.invalidReasons.length > 0 && (
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 opacity-90">
                        {result.rowValidation.invalidReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}

              {/* Table 2: Mapped ReachDem Data */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base text-primary">
                    Mapped ReachDem Contacts
                  </h3>
                  <div className="flex items-center gap-2">
                    {displayCustomFields.length > 0 && (
                      <Badge
                        variant="outline"
                        className="border-primary/20 bg-primary/5 text-primary"
                      >
                        +{displayCustomFields.length} Custom Fields
                      </Badge>
                    )}
                    <Badge
                      variant="secondary"
                      className="tabular-nums font-mono"
                    >
                      {result.rowValidation.validRows}/
                      {result.rowValidation.totalRows} valid
                    </Badge>

                    {isEditing && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 h-7 px-2 border-dashed text-xs text-muted-foreground"
                          >
                            <IconPlus className="size-3.5 mr-1" /> Add Column
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-[200px] max-h-[300px] overflow-y-auto"
                        >
                          {getUnusedColumns().length === 0 ? (
                            <div className="p-2 text-xs text-muted-foreground text-center">
                              All columns mapped
                            </div>
                          ) : (
                            getUnusedColumns().map((col) => (
                              <DropdownMenuItem
                                key={col}
                                onClick={() => addCustomColumn(col)}
                                className="text-xs"
                              >
                                {col}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <Button
                      variant={isEditing ? "default" : "outline"}
                      size="sm"
                      className="ml-2 h-7 px-3 text-xs"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      {isEditing ? (
                        <>
                          <IconCheck className="size-3.5 mr-1.5" /> Done
                        </>
                      ) : (
                        <>
                          <IconEdit className="size-3.5 mr-1.5" /> Edit Mapping
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border overflow-x-auto shadow-sm ring-1 ring-primary/10">
                  <Table className="text-sm">
                    <TableHeader className="bg-primary/5">
                      <TableRow>
                        {STANDARD_FIELDS.map((field) => {
                          const mapping = result.standardMappings[field.key];
                          const override = manualOverrides[field.key];

                          let currentValue = "__unmapped";
                          let isConcat = false;

                          if (override) {
                            currentValue = override;
                          } else if (mapping.transform === "concat") {
                            isConcat = true;
                            currentValue = "__concat";
                          } else if (
                            mapping.transform !== "none" &&
                            mapping.sourceColumns.length > 0
                          ) {
                            currentValue = mapping.sourceColumns[0];
                          }

                          return (
                            <TableHead
                              key={field.key}
                              className="whitespace-nowrap min-w-[140px]"
                            >
                              <div className="flex flex-col gap-1.5 py-1.5">
                                <span className="font-medium text-foreground">
                                  {field.label}
                                </span>
                                {isEditing ? (
                                  <Select
                                    value={currentValue}
                                    onValueChange={(val) =>
                                      setManualOverrides((prev) => ({
                                        ...prev,
                                        [field.key]: val,
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-[11px] px-2 shadow-sm border-dashed bg-background hover:bg-muted/50 transition-colors">
                                      <SelectValue placeholder="Ignore" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem
                                        value="__unmapped"
                                        className="text-muted-foreground italic"
                                      >
                                        -- Ignore --
                                      </SelectItem>
                                      {isConcat && (
                                        <SelectItem
                                          value="__concat"
                                          className="text-primary font-medium"
                                          disabled
                                        >
                                          Auto:{" "}
                                          {mapping.sourceColumns.join(" + ")}
                                        </SelectItem>
                                      )}
                                      {columns.map((c) => (
                                        <SelectItem key={c} value={c}>
                                          {c}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    {currentValue === "__unmapped"
                                      ? "—"
                                      : currentValue === "__concat"
                                        ? mapping.sourceColumns.join(" + ")
                                        : currentValue}
                                  </span>
                                )}
                              </div>
                            </TableHead>
                          );
                        })}
                        {displayCustomFields.map((f) => (
                          <TableHead
                            key={f.key}
                            className="whitespace-nowrap border-l-2 border-primary/20 bg-primary/5 min-w-[140px]"
                          >
                            <div className="flex flex-col gap-1.5 py-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className="font-medium text-primary truncate max-w-[100px]"
                                  title={f.displayLabel}
                                >
                                  {f.displayLabel}
                                </span>
                                {!isEditing && (
                                  <span className="text-[9px] uppercase tracking-wider font-semibold text-primary/60 shrink-0">
                                    {f.type}
                                  </span>
                                )}
                              </div>
                              {isEditing ? (
                                <Select
                                  value={f.currentSource}
                                  onValueChange={(val) =>
                                    setManualOverrides((prev) => ({
                                      ...prev,
                                      [f.key]: val,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-7 text-[11px] px-2 shadow-sm border-dashed bg-background border-primary/30 text-primary hover:bg-primary/10 hover:text-primary transition-colors">
                                    <SelectValue placeholder="Select column" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem
                                      value="__unmapped"
                                      className="text-destructive font-medium focus:bg-destructive/10 focus:text-destructive"
                                    >
                                      -- Remove Column --
                                    </SelectItem>
                                    {columns.map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span
                                  className="text-[10px] font-mono text-muted-foreground truncate"
                                  title={f.currentSource}
                                >
                                  {f.currentSource}
                                </span>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappedRows.map((row, i) => (
                        <TableRow key={i}>
                          {STANDARD_FIELDS.map((field) => (
                            <TableCell
                              key={field.key}
                              className="whitespace-nowrap tabular-nums"
                            >
                              {row[field.key] || (
                                <span className="text-muted-foreground italic opacity-40">
                                  —
                                </span>
                              )}
                            </TableCell>
                          ))}
                          {displayCustomFields.map((f) => (
                            <TableCell
                              key={f.key}
                              className="whitespace-nowrap tabular-nums border-l-2 border-primary/10"
                            >
                              {row[f.key] || (
                                <span className="text-muted-foreground italic opacity-40">
                                  —
                                </span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleDownloadJSON} className="gap-2">
                    <IconDownload className="size-4" />
                    Download JSON ({allParsedRows.length} rows)
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
