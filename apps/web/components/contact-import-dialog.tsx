"use client";

import * as React from "react";
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
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

const STEPS = [
  "Upload",
  "Preview",
  "Mapping",
  "Duplicates",
  "Confirm",
] as const;
type Step = (typeof STEPS)[number];

const REACHDEM_FIELDS = [
  { key: "name", label: "Name", required: true },
  { key: "phone", label: "Phone", required: false },
  { key: "email", label: "Email", required: false },
  { key: "sexe", label: "Gender", required: false },
  { key: "birthdate", label: "Birthdate", required: false },
  { key: "address", label: "Address", required: false },
  { key: "work", label: "Job Title", required: false },
  { key: "enterprise", label: "Enterprise", required: false },
  { key: "__skip", label: "Skip this column", required: false },
];

// Simulated detected columns from CSV
const DETECTED_COLUMNS = [
  "Nom complet",
  "Telephone",
  "Adresse mail",
  "Entreprise",
  "Poste",
];

// Simulated preview data
const PREVIEW_DATA = [
  {
    "Nom complet": "Amadou Diallo",
    Telephone: "+221771234567",
    "Adresse mail": "amadou@tech.sn",
    Entreprise: "TechDak",
    Poste: "CTO",
  },
  {
    "Nom complet": "Fatou Sow",
    Telephone: "+221782345678",
    "Adresse mail": "fatou@wave.com",
    Entreprise: "Wave",
    Poste: "Marketing",
  },
  {
    "Nom complet": "Moussa Ndiaye",
    Telephone: "+221763456789",
    "Adresse mail": "",
    Entreprise: "",
    Poste: "",
  },
  {
    "Nom complet": "Aissatou Ba",
    Telephone: "",
    "Adresse mail": "aissatou@free.sn",
    Entreprise: "Free",
    Poste: "PM",
  },
  {
    "Nom complet": "Ibrahima Fall",
    Telephone: "+221785678901",
    "Adresse mail": "ibrahima@orange.sn",
    Entreprise: "Orange",
    Poste: "Engineer",
  },
];

export function ContactImportDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [currentStep, setCurrentStep] = React.useState<Step>("Upload");
  const [uploadedFile, setUploadedFile] = React.useState<string | null>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [mapping, setMapping] = React.useState<Record<string, string>>({
    "Nom complet": "name",
    Telephone: "phone",
    "Adresse mail": "email",
    Entreprise: "enterprise",
    Poste: "work",
  });
  const [duplicateStrategy, setDuplicateStrategy] = React.useState("skip");
  const [importing, setImporting] = React.useState(false);
  const [importDone, setImportDone] = React.useState(false);

  const stepIndex = STEPS.indexOf(currentStep);

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

  const handleUpload = () => {
    setUploadedFile("contacts_export_2025.csv");
    setTimeout(() => setCurrentStep("Preview"), 400);
  };

  const handleImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      setImportDone(true);
    }, 2000);
  };

  const handleReset = () => {
    setCurrentStep("Upload");
    setUploadedFile(null);
    setImporting(false);
    setImportDone(false);
  };

  const nameIsMapped = Object.values(mapping).includes("name");
  const hasPhoneOrEmail =
    Object.values(mapping).includes("phone") ||
    Object.values(mapping).includes("email");
  const canProceedMapping = nameIsMapped && hasPhoneOrEmail;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) handleReset();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
        <div className="flex items-center gap-1 mb-2">
          {STEPS.map((step, i) => (
            <React.Fragment key={step}>
              <div className="flex items-center gap-1.5">
                <div
                  className={`flex items-center justify-center size-6 rounded-full text-xs font-medium transition-colors ${
                    i < stepIndex
                      ? "bg-foreground text-background"
                      : i === stepIndex
                        ? "bg-foreground text-background"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < stepIndex ? <IconCheck className="size-3.5" /> : i + 1}
                </div>
                <span
                  className={`text-xs hidden sm:inline ${i === stepIndex ? "font-medium" : "text-muted-foreground"}`}
                >
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px ${i < stepIndex ? "bg-foreground" : "bg-border"}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <Separator />

        {/* Step: Upload */}
        {currentStep === "Upload" && (
          <div className="flex flex-col gap-4 py-2">
            <div
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer ${
                isDragOver
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleUpload();
              }}
              onClick={handleUpload}
            >
              <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                <IconUpload className="size-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">
                  Drop your file here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports CSV and XLSX files up to 10MB
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>
            <Button variant="outline" className="gap-2">
              <IconClipboard className="size-4" />
              Paste from clipboard
            </Button>
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
              <IconFileSpreadsheet className="size-4 text-muted-foreground shrink-0" />
              <p className="text-xs text-muted-foreground">
                Need a template?{" "}
                <button className="underline underline-offset-2 text-foreground font-medium hover:no-underline">
                  Download our CSV template
                </button>
              </p>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {currentStep === "Preview" && (
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconFileSpreadsheet className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{uploadedFile}</span>
                <Badge variant="secondary" className="font-normal text-xs">
                  247 rows
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUploadedFile(null);
                  setCurrentStep("Upload");
                }}
              >
                <IconX className="size-4" />
                Remove
              </Button>
            </div>
            <div className="rounded-lg border overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      #
                    </th>
                    {DETECTED_COLUMNS.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-left font-medium text-muted-foreground"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PREVIEW_DATA.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">
                        {i + 1}
                      </td>
                      {DETECTED_COLUMNS.map((col) => (
                        <td key={col} className="px-3 py-2">
                          {row[col as keyof typeof row] || (
                            <span className="text-muted-foreground">--</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Showing 5 of 247 rows. {DETECTED_COLUMNS.length} columns detected.
            </p>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={goBack}>
                <IconArrowLeft className="size-4" />
                Back
              </Button>
              <Button size="sm" onClick={goNext}>
                Map Fields
                <IconArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Mapping */}
        {currentStep === "Mapping" && (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Match your file columns to ReachDem fields. <strong>Name</strong>{" "}
              and at least <strong>Phone</strong> or <strong>Email</strong> are
              required.
            </p>
            <div className="flex flex-col gap-3">
              {DETECTED_COLUMNS.map((col) => {
                const currentMapping = mapping[col] || "";
                const field = REACHDEM_FIELDS.find(
                  (f) => f.key === currentMapping,
                );
                return (
                  <div key={col} className="flex items-center gap-3">
                    <div className="flex-1 rounded-md bg-muted px-3 py-2 text-sm">
                      {col}
                    </div>
                    <IconArrowRight className="size-4 text-muted-foreground shrink-0" />
                    <Select
                      value={currentMapping}
                      onValueChange={(val) =>
                        setMapping((prev) => ({ ...prev, [col]: val }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REACHDEM_FIELDS.map((f) => (
                          <SelectItem key={f.key} value={f.key}>
                            <span className="flex items-center gap-2">
                              {f.label}
                              {f.required && (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] px-1 py-0"
                                >
                                  Required
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
            {!canProceedMapping && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <IconAlertTriangle className="size-4 shrink-0" />
                <span>
                  You must map <strong>Name</strong> and at least{" "}
                  <strong>Phone</strong> or <strong>Email</strong>.
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={goBack}>
                <IconArrowLeft className="size-4" />
                Back
              </Button>
              <Button size="sm" onClick={goNext} disabled={!canProceedMapping}>
                Duplicate Rules
                <IconArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Duplicates */}
        {currentStep === "Duplicates" && (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Choose how to handle contacts that already exist in your database
              (matched by phone or email).
            </p>
            <RadioGroup
              value={duplicateStrategy}
              onValueChange={setDuplicateStrategy}
              className="flex flex-col gap-3"
            >
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-foreground">
                <RadioGroupItem value="skip" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Skip duplicates</p>
                  <p className="text-xs text-muted-foreground">
                    Existing contacts will be ignored. Only new contacts are
                    imported.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-foreground">
                <RadioGroupItem value="update" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Update existing</p>
                  <p className="text-xs text-muted-foreground">
                    Existing contacts will be updated with imported data. Empty
                    fields are left unchanged.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-foreground">
                <RadioGroupItem value="merge" className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Merge (import priority)</p>
                  <p className="text-xs text-muted-foreground">
                    All fields from the import will overwrite existing data,
                    even if empty.
                  </p>
                </div>
              </label>
            </RadioGroup>
            <div className="flex justify-between">
              <Button variant="outline" size="sm" onClick={goBack}>
                <IconArrowLeft className="size-4" />
                Back
              </Button>
              <Button size="sm" onClick={goNext}>
                Review
                <IconArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {currentStep === "Confirm" && !importDone && (
          <div className="flex flex-col gap-4 py-2">
            <p className="text-sm text-muted-foreground">
              Review the import summary before proceeding.
            </p>
            <div className="rounded-lg border divide-y">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">File</span>
                <span className="text-sm font-medium">{uploadedFile}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Total rows
                </span>
                <span className="text-sm font-medium">247</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Valid contacts
                </span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  231
                </span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Errors (missing required fields)
                </span>
                <span className="text-sm font-medium text-destructive">12</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Potential duplicates
                </span>
                <span className="text-sm font-medium">4</span>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Duplicate strategy
                </span>
                <Badge variant="secondary" className="font-normal capitalize">
                  {duplicateStrategy}
                </Badge>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Mapped fields
                </span>
                <span className="text-sm font-medium">
                  {Object.values(mapping).filter((v) => v !== "__skip").length}{" "}
                  of {DETECTED_COLUMNS.length}
                </span>
              </div>
            </div>
            {importing && (
              <div className="flex flex-col gap-2">
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-foreground rounded-full animate-pulse"
                    style={{ width: "60%" }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Importing contacts...
                </p>
              </div>
            )}
            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={goBack}
                disabled={importing}
              >
                <IconArrowLeft className="size-4" />
                Back
              </Button>
              <Button size="sm" onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : "Start Import"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {currentStep === "Confirm" && importDone && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex items-center justify-center size-12 rounded-full bg-green-100 dark:bg-green-900/30">
              <IconCheck className="size-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold">Import completed</p>
              <p className="text-sm text-muted-foreground mt-1">
                231 contacts imported successfully. 12 rows had errors.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <IconDownload className="size-4" />
              Download error report
            </Button>
            <Separator />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                View Contacts
              </Button>
              <Button variant="outline" size="sm">
                Create a Segment
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
