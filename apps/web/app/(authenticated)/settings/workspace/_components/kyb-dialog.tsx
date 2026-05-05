"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { submitKybVerification } from "@/actions/kyb-verification";
import { AlertCircle, Loader2, UploadCloud } from "lucide-react";
import {
  ALLOWED_KYB_DOC_TYPES,
  ALLOWED_KYB_IMAGE_TYPES,
} from "@/lib/server/kyb";

export function KybDialog({
  status,
  initialWebsiteUrl = "",
  children,
}: {
  status: string;
  initialWebsiteUrl?: string | null;
  children: React.ReactNode;
}) {
  const normalizedWebsiteUrl = initialWebsiteUrl ?? "";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState(normalizedWebsiteUrl);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [bizFile, setBizFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  const validateFile = (file: File, types: string[], name: string) => {
    if (file.size > MAX_FILE_SIZE) {
      return `${name} is too large. Maximum size is 5MB.`;
    }
    if (!types.includes(file.type)) {
      return `${name} format not allowed.`;
    }
    return null;
  };

  const uploadFile = async (file: File, docType: "id" | "business") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);

    const uploadRes = await fetch("/api/kyb/upload", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const payload = await uploadRes
        .json()
        .catch(() => ({ error: `Failed to upload ${docType}` }));
      throw new Error(payload.error || `Failed to upload ${docType}`);
    }

    const payload = await uploadRes.json();

    if (!payload.key) {
      throw new Error(`Missing uploaded key for ${docType}`);
    }

    return payload.key as string;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!websiteUrl || !idFile || !bizFile) {
      setError("Please fill all the required fields.");
      return;
    }

    if (status === "pending" || status === "verified") {
      setError(
        "You cannot submit documents while your status is pending or verified."
      );
      return;
    }

    const idFileError = validateFile(
      idFile,
      ALLOWED_KYB_IMAGE_TYPES,
      "Identity Document"
    );
    if (idFileError) return setError(idFileError);

    const bizFileError = validateFile(
      bizFile,
      ALLOWED_KYB_DOC_TYPES,
      "Business Document"
    );
    if (bizFileError) return setError(bizFileError);

    setIsSubmitting(true);

    try {
      toast.info("Uploading documents (this may take a moment)...");

      // Upload both files concurrently
      const [idKey, bizKey] = await Promise.all([
        uploadFile(idFile, "id"),
        uploadFile(bizFile, "business"),
      ]);

      const submitRes = await submitKybVerification({
        websiteUrl,
        idDocumentKey: idKey,
        businessDocumentKey: bizKey,
      });

      if (submitRes.error) {
        throw new Error(submitRes.error);
      }

      toast.success(
        "Documents uploaded successfully. Verification is pending."
      );
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setError(null);
      setWebsiteUrl(normalizedWebsiteUrl);
      setIdFile(null);
      setBizFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Verify your Workspace</DialogTitle>
            <DialogDescription>
              Submit your identification and business registration documents.
              These will be securely reviewed by our compliance team. Max size
              5MB each.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="websiteUrl">Website or Social Media URL *</Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://your-company.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idPhoto">Identity Document (Image) *</Label>
              <Input
                id="idPhoto"
                type="file"
                accept={ALLOWED_KYB_IMAGE_TYPES.join(",")}
                onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                required
                disabled={isSubmitting}
                className="cursor-pointer"
              />
              <p className="text-muted-foreground text-xs">
                Accepted: JPG, PNG, WebP
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bizFile">Business Setup Document *</Label>
              <Input
                id="bizFile"
                type="file"
                accept={ALLOWED_KYB_DOC_TYPES.join(",")}
                onChange={(e) => setBizFile(e.target.files?.[0] || null)}
                required
                disabled={isSubmitting}
                className="cursor-pointer"
              />
              <p className="text-muted-foreground text-xs">
                Accepted: PDF, JPG, PNG, WebP
              </p>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-3 text-sm">
                <AlertCircle className="size-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-between justify-end gap-3">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="mr-2 size-4" />
                  Submit Documents
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
