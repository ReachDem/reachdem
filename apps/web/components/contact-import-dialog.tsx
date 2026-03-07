"use client";

import * as React from "react";
import { useState } from "react";
import {
  IconUpload,
  IconFileSpreadsheet,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconArrowRight,
  IconArrowLeft,
  IconDownload,
  IconClipboard,
  IconLoader2,
  IconPlus,
  IconEdit,
} from "@tabler/icons-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AiMappingTester } from "@/components/ai-mapping-tester";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  parseContactFile,
  getSampleData,
  isValidContactFile,
} from "@/lib/utils/parse-contacts-file";
import { generateContactMapping, MappingResult } from "@/lib/utils/ai-mapping";
import { STANDARD_FIELDS, applyMapping } from "@/lib/utils/ai-mapping-client";
import { formatPhoneE164 } from "@/lib/utils/phone";
import {
  checkContactDuplicates,
  importContactsBulk,
  getDefaultCountryCode,
} from "@/app/actions/contacts";

const STEPS = [
  "Upload",
  "Preview",
  "Mapping",
  "Duplicates",
  "Confirm",
] as const;
type Step = (typeof STEPS)[number];

export function ContactImportDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("Upload");
  const [isDragOver, setIsDragOver] = useState(false);

  // File & Parsing state
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [allParsedRows, setAllParsedRows] = useState<Record<string, string>[]>(
    []
  );
  const [sampleData, setSampleData] = useState<Record<string, string>[]>([]);

  // Mapping state
  const [isMappingLoading, setIsMappingLoading] = useState(false);
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(
    null
  );
  const [manualOverrides, setManualOverrides] = useState<
    Record<string, string>
  >({});
  const [isEditing, setIsEditing] = useState(false);

  // Duplicate state
  const [duplicateStrategy, setDuplicateStrategy] = useState<
    "skip" | "update" | "merge"
  >("skip");
  const [duplicateStats, setDuplicateStats] = useState({
    emails: 0,
    phones: 0,
    missingRequires: 0,
  });

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, total: 0 });

  const stepIndex = STEPS.indexOf(currentStep);

  const handleReset = () => {
    setCurrentStep("Upload");
    setFile(null);
    setColumns([]);
    setAllParsedRows([]);
    setSampleData([]);
    setMappingResult(null);
    setManualOverrides({});
    setIsEditing(false);
    setDuplicateStrategy("skip");
    setIsImporting(false);
    setImportDone(false);
    setDuplicateStats({ emails: 0, phones: 0, missingRequires: 0 });
    setImportStats({ success: 0, total: 0 });
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[stepIndex + 1]);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(STEPS[stepIndex - 1]);
    }
  };

  // 1. Upload & Parsing
  const onFileSelected = async (selectedFile?: File) => {
    if (!selectedFile) return;
    const validation = isValidContactFile(selectedFile);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid file");
      return;
    }

    try {
      const parsed = await parseContactFile(selectedFile);
      if (parsed.totalRows > 100) {
        toast.error("File is too large. Please upload at most 100 contacts.");
        return;
      }
      if (parsed.totalRows === 0) {
        toast.error("File is empty.");
        return;
      }

      setFile(selectedFile);
      setColumns(parsed.columns);
      setAllParsedRows(parsed.rows);
      setSampleData(getSampleData(parsed.rows, 5));
      setCurrentStep("Preview");
    } catch (err: any) {
      toast.error(err.message || "Failed to parse file.");
    }
  };

  // 2. Mapping
  const runMapping = async () => {
    if (!file || columns.length === 0) return;
    setIsMappingLoading(true);
    try {
      const result = await generateContactMapping({
        columns,
        sampleData,
        existingCustomFields: [],
        sourceName: file.name,
      });
      setMappingResult(result);
      setCurrentStep("Mapping");
    } catch (err: any) {
      toast.error(err.message || "Mapping failed.");
    } finally {
      setIsMappingLoading(false);
    }
  };

  const displayCustomFields = React.useMemo(() => {
    if (!mappingResult) return [];
    const aiFields = mappingResult.suggestedCustomFields
      .slice(0, 5)
      .map((cf) => ({
        key: cf.key,
        label: cf.label,
        originalSource: cf.sourceColumn,
        type: cf.type,
      }));

    Object.entries(manualOverrides).forEach(([key, val]) => {
      if (
        key.startsWith("custom_") &&
        val !== "__unmapped" &&
        !aiFields.some((f) => f.key === key)
      ) {
        aiFields.push({ key, label: val, originalSource: val, type: "TEXT" });
      }
    });

    return aiFields
      .map((cf) => {
        const override = manualOverrides[cf.key];
        const currentSource = override || cf.originalSource;
        return {
          ...cf,
          currentSource,
          displayLabel:
            override && override !== cf.originalSource ? override : cf.label,
          isIgnored: currentSource === "__unmapped",
        };
      })
      .filter((cf) => !cf.isIgnored);
  }, [mappingResult, manualOverrides]);

  const mappedSampleRows = React.useMemo(() => {
    if (!mappingResult || !sampleData.length) return [];
    return sampleData.map((sourceRow) => {
      const row: Record<string, string> = {};
      for (const field of STANDARD_FIELDS) {
        const override = manualOverrides[field.key];
        if (override) {
          row[field.key] =
            override === "__unmapped" ? "" : sourceRow[override] || "";
        } else {
          row[field.key] = applyMapping(
            mappingResult.standardMappings[field.key],
            sourceRow
          );
        }
      }
      for (const cf of displayCustomFields) {
        row[cf.key] = sourceRow[cf.currentSource] || "";
      }
      return row;
    });
  }, [mappingResult, sampleData, manualOverrides, displayCustomFields]);

  const getUnusedColumns = () => {
    if (!mappingResult) return [];
    const usedStandard = new Set<string>();
    for (const field of STANDARD_FIELDS) {
      const mapping = mappingResult.standardMappings[field.key];
      const override = manualOverrides[field.key];
      if (override && override !== "__unmapped" && override !== "__concat") {
        usedStandard.add(override);
      } else if (!override && mapping.transform !== "none") {
        mapping.sourceColumns.forEach((c) => usedStandard.add(c));
      }
    }
    const usedCustom = new Set(displayCustomFields.map((f) => f.currentSource));
    return columns.filter((c) => !usedStandard.has(c) && !usedCustom.has(c));
  };

  const addCustomColumn = (colName: string) => {
    const aiSuggestion = mappingResult?.suggestedCustomFields.find(
      (f) => f.sourceColumn === colName
    );
    const key = aiSuggestion ? aiSuggestion.key : `custom_${colName}`;
    setManualOverrides((prev) => ({ ...prev, [key]: colName }));
  };

  // Helper to map a full row
  const getMappedRow = (
    sourceRow: Record<string, string>,
    countryCode: string
  ) => {
    const row: any = { customFields: {} };
    if (!mappingResult) return row;

    for (const field of STANDARD_FIELDS) {
      const override = manualOverrides[field.key];
      let val = "";
      if (override) {
        val = override === "__unmapped" ? "" : sourceRow[override] || "";
      } else {
        val = applyMapping(
          mappingResult.standardMappings[field.key],
          sourceRow
        );
      }
      row[field.key] = val;
    }

    for (const cf of displayCustomFields) {
      row.customFields[cf.key] = sourceRow[cf.currentSource] || "";
    }

    // Standardize
    if (row.email) row.email = row.email.toLowerCase().trim();
    if (row.phone) row.phoneE164 = formatPhoneE164(row.phone, countryCode);

    return row;
  };

  // Provide stats before Confirmation
  const calculateStats = async () => {
    if (!mappingResult) return;

    const countryCode = await getDefaultCountryCode();

    let missing = 0;
    const emailsToCheck: string[] = [];
    const phonesToCheck: string[] = [];

    allParsedRows.forEach((r) => {
      const mapped = getMappedRow(r, countryCode);
      if (!mapped.name || (!mapped.email && !mapped.phoneE164)) {
        missing++;
      } else {
        if (mapped.email) emailsToCheck.push(mapped.email);
        if (mapped.phoneE164) phonesToCheck.push(mapped.phoneE164);
      }
    });

    try {
      const { existingEmails, existingPhones } = await checkContactDuplicates(
        "",
        emailsToCheck,
        phonesToCheck
      );
      setDuplicateStats({
        emails: existingEmails.length,
        phones: existingPhones.length,
        missingRequires: missing,
      });
      goNext();
    } catch (err: any) {
      toast.error("Failed to check duplicates: " + err.message);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportStats({ success: 0, total: allParsedRows.length });

    const toastId = toast.loading("Starting import...", {
      position: "bottom-right",
    });

    try {
      const countryCode = await getDefaultCountryCode();
      const validRows = allParsedRows
        .map((r) => getMappedRow(r, countryCode))
        .filter((r) => r.name && (r.email || r.phoneE164));

      let successCount = 0;
      const chunkSize = 10;

      if (validRows.length === 0) {
        toast.success("No valid contacts to import.", {
          id: toastId,
          position: "bottom-right",
        });
        setImportDone(true);
        setIsImporting(false);
        return;
      }

      for (let i = 0; i < validRows.length; i += chunkSize) {
        toast.loading(
          `Importing contacts... ${successCount} / ${validRows.length}`,
          {
            id: toastId,
            position: "bottom-right",
          }
        );
        const chunk = validRows.slice(i, i + chunkSize);
        const result = await importContactsBulk("", chunk, duplicateStrategy);
        successCount += result.count;
        setImportStats({ success: successCount, total: validRows.length });

        // Let React paint the progress bar before next chunk
        await new Promise((r) => setTimeout(r, 150));
      }

      toast.success(
        `Import completed successfully! ${successCount} contacts imported.`,
        {
          id: toastId,
          position: "bottom-right",
        }
      );
      setImportDone(true);
    } catch (err: any) {
      toast.error("Import failed: " + err.message, {
        id: toastId,
        position: "bottom-right",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(handleReset, 300);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={`max-h-[85vh] overflow-x-hidden overflow-y-auto transition-all duration-300 ${
          currentStep === "Upload" ||
          currentStep === "Duplicates" ||
          currentStep === "Confirm"
            ? "w-full sm:max-w-xl"
            : "w-full sm:max-w-3xl lg:max-w-5xl xl:max-w-[1080px]"
        }`}
      >
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>Import Contacts</DialogTitle>
            {process.env.NODE_ENV === "development" && <AiMappingTester />}
          </div>
          <DialogDescription>
            Add contacts to ReachDem from a CSV or XLSX file.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="mb-2 flex w-full min-w-0 items-center gap-1">
          {STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${i < stepIndex ? "bg-foreground text-background" : i === stepIndex ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}
                >
                  {i < stepIndex ? <IconCheck className="size-3.5" /> : i + 1}
                </div>
                <span
                  className={`hidden text-xs sm:inline ${i === stepIndex ? "font-medium" : "text-muted-foreground"}`}
                >
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 ${i < stepIndex ? "bg-foreground" : "bg-border"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <Separator />

        {/* Step: Upload */}
        {currentStep === "Upload" && (
          <div className="flex w-full min-w-0 flex-col gap-4 py-2">
            <div
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors ${isDragOver ? "border-foreground bg-muted" : "border-border hover:border-foreground/50"}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files?.length)
                  onFileSelected(e.dataTransfer.files[0]);
              }}
            >
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <IconUpload className="text-muted-foreground size-5" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop your file here or click to browse
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Supports CSV and XLSX files up to 10MB, Max 100 rows
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files?.length) onFileSelected(e.target.files[0]);
                }}
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {currentStep === "Preview" && file && (
          <div className="flex w-full min-w-0 flex-col gap-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconFileSpreadsheet className="text-muted-foreground size-4" />
                <span className="text-sm font-medium">{file.name}</span>
                <Badge variant="secondary" className="text-xs font-normal">
                  {allParsedRows.length} rows
                </Badge>
              </div>
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border shadow-sm">
              <Table className="text-xs">
                <TableHeader className="bg-muted sticky top-0">
                  <TableRow>
                    {columns.map((col) => (
                      <TableHead
                        key={col}
                        className="text-foreground font-medium whitespace-nowrap"
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
            <p className="text-muted-foreground text-xs">
              Showing max 5 rows preview.
            </p>
            <div className="mt-2 flex justify-between">
              <Button variant="outline" size="sm" onClick={goBack}>
                <IconArrowLeft className="size-4" /> Back
              </Button>
              <Button
                size="sm"
                onClick={runMapping}
                disabled={isMappingLoading}
              >
                {isMappingLoading ? (
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {isMappingLoading ? "Analyzing Fields..." : "Map Fields"}
                {!isMappingLoading && (
                  <IconArrowRight className="ml-2 size-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Mapping */}
        {currentStep === "Mapping" && mappingResult && (
          <div className="flex w-full min-w-0 flex-col gap-4 py-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Match your file columns to ReachDem fields.{" "}
                <strong>Name</strong> and at least <strong>Phone</strong> or{" "}
                <strong>Email</strong> are required.
              </p>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-muted-foreground h-7 border-dashed px-2 text-xs"
                      >
                        <IconPlus className="mr-1 size-3.5" /> Add Column
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="max-h-[300px] w-[200px] overflow-y-auto"
                    >
                      {getUnusedColumns().length === 0 ? (
                        <div className="text-muted-foreground p-2 text-center text-xs">
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
                  className="h-7 px-3 text-xs"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? (
                    <>
                      <IconCheck className="mr-1.5 size-3.5" /> Done
                    </>
                  ) : (
                    <>
                      <IconEdit className="mr-1.5 size-3.5" /> Edit Mapping
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="ring-primary/10 max-h-[50vh] overflow-x-auto overflow-y-auto rounded-md border shadow-sm ring-1">
              <Table className="text-sm">
                <TableHeader className="bg-primary/5">
                  <TableRow>
                    {STANDARD_FIELDS.map((field) => {
                      const mapping = mappingResult.standardMappings[field.key];
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
                          className="min-w-[140px] whitespace-nowrap"
                        >
                          <div className="flex flex-col gap-1.5 py-1.5">
                            <span className="text-foreground font-medium">
                              {field.label}{" "}
                              {field.required && (
                                <Badge
                                  variant="destructive"
                                  className="ml-1 h-3.5 px-1 text-[10px] font-normal"
                                >
                                  Req
                                </Badge>
                              )}
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
                                <SelectTrigger className="bg-background h-2 border-dashed px-2 text-[11px] shadow-sm">
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
                                      Auto: {mapping.sourceColumns.join(" + ")}
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
                              <span className="text-muted-foreground truncate font-mono text-[10px]">
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
                        className="border-primary/20 bg-primary/5 min-w-[140px] border-l-2 whitespace-nowrap"
                      >
                        <div className="flex flex-col gap-1.5 py-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-primary max-w-[100px] truncate font-medium">
                              {f.displayLabel}
                            </span>
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
                              <SelectTrigger className="bg-background border-primary/30 text-primary h-7 border-dashed px-2 text-[11px] shadow-sm">
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="__unmapped"
                                  className="text-destructive font-medium"
                                >
                                  -- Remove --
                                </SelectItem>
                                {columns.map((c) => (
                                  <SelectItem key={c} value={c}>
                                    {c}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground truncate font-mono text-[10px]">
                              {f.currentSource}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedSampleRows.map((row, i) => (
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
                          className="border-primary/10 border-l-2 whitespace-nowrap tabular-nums"
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

            <div className="mt-4 flex justify-between">
              <Button variant="outline" size="sm" onClick={goBack}>
                <IconArrowLeft className="size-4" /> Back
              </Button>
              <Button size="sm" onClick={goNext}>
                Duplicate Rules <IconArrowRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Duplicates */}
        {currentStep === "Duplicates" && (
          <div className="flex w-full min-w-0 flex-col gap-4 py-2">
            <p className="text-muted-foreground text-sm">
              Choose how to handle contacts that already exist in your database
              (matched by phone or email).
            </p>
            <RadioGroup
              value={duplicateStrategy}
              onValueChange={(val: any) => setDuplicateStrategy(val)}
              className="flex flex-col gap-3"
            >
              <label className="hover:bg-muted/50 has-[:checked]:border-foreground flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors">
                <RadioGroupItem value="skip" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Skip duplicates</p>
                  <p className="text-muted-foreground text-xs">
                    Existing contacts will be ignored. Only new contacts are
                    imported.
                  </p>
                </div>
              </label>
              <label className="hover:bg-muted/50 has-[:checked]:border-foreground flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors">
                <RadioGroupItem value="update" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Update existing</p>
                  <p className="text-muted-foreground text-xs">
                    Existing contacts will be updated with imported data. Empty
                    fields are left unchanged.
                  </p>
                </div>
              </label>
              <label className="hover:bg-muted/50 has-[:checked]:border-foreground flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors">
                <RadioGroupItem value="merge" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Merge (import priority)</p>
                  <p className="text-muted-foreground text-xs">
                    All fields from the import will overwrite existing data,
                    even if empty.
                  </p>
                </div>
              </label>
            </RadioGroup>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={goBack}>
                <IconArrowLeft className="size-4" /> Back
              </Button>
              <Button size="sm" onClick={calculateStats}>
                Review <IconArrowRight className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {currentStep === "Confirm" && !importDone && (
          <div className="flex w-full min-w-0 flex-col gap-4 py-2">
            <p className="text-muted-foreground text-sm">
              Review the import summary before proceeding.
            </p>
            <div className="bg-card text-card-foreground divide-y rounded-lg border">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground text-sm">File</span>
                <span className="max-w-[200px] truncate text-sm font-medium">
                  {file?.name}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground text-sm">
                  Total rows
                </span>
                <span className="text-sm font-medium">
                  {allParsedRows.length}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground text-sm">
                  Valid contacts to parse
                </span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {allParsedRows.length - duplicateStats.missingRequires}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground text-sm">
                  Errors (missing name & contact info)
                </span>
                <span className="text-destructive text-sm font-medium">
                  {duplicateStats.missingRequires}
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground text-sm">
                  Potential duplicate queries hit
                </span>
                <span className="text-sm font-medium text-amber-600 dark:text-amber-500">
                  {duplicateStats.emails} Emails, {duplicateStats.phones} Phones
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground text-sm">
                  Duplicate strategy
                </span>
                <Badge variant="secondary" className="font-normal capitalize">
                  {duplicateStrategy}
                </Badge>
              </div>
            </div>

            {isImporting && (
              <div className="bg-muted/20 flex flex-col gap-2 rounded-lg border p-4">
                <div className="mb-1 flex justify-between text-xs">
                  <span>Uploading chunked data...</span>
                  <span>
                    {importStats.success} / {importStats.total}
                  </span>
                </div>
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-all duration-300"
                    style={{
                      width: `${importStats.total === 0 ? 0 : Math.round((importStats.success / importStats.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="mt-2 flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={goBack}
                disabled={isImporting}
              >
                <IconArrowLeft className="size-4" /> Back
              </Button>
              <Button size="sm" onClick={handleImport} disabled={isImporting}>
                {isImporting ? (
                  <IconLoader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {isImporting ? "Importing..." : "Start Import"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {currentStep === "Confirm" && importDone && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <IconCheck className="size-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold">Import completed</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {importStats.success} contacts imported successfully.{" "}
                {duplicateStats.missingRequires} rows had layout validation
                errors and were skipped.
              </p>
            </div>
            <Separator className="my-2" />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
