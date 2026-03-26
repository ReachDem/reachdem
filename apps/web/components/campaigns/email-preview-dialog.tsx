"use client";

import { useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { EmailPreviewIFrame } from "./email-preview-iframe";

interface EmailPreviewDialogProps {
  subject: string;
  htmlContent: string;
  bodyJson?: any; // TipTap JSON content
  disabled?: boolean;
  fontFamily?: string;
  fontWeights?: number[];
}

export function EmailPreviewDialog({
  subject,
  htmlContent,
  bodyJson,
  disabled = false,
  fontFamily = "Inter",
  fontWeights = [400, 600, 700],
}: EmailPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState<string>("");

  const handlePreview = async () => {
    if (!htmlContent || htmlContent.trim().length === 0) {
      toast.error("No email content to preview");
      return;
    }

    setIsLoading(true);

    try {
      // Generate proper HTML structure
      const response = await fetch("/api/campaigns/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          htmlContent: htmlContent,
          fontFamily: fontFamily,
          fontWeights: fontWeights,
        }),
      });

      if (response.ok) {
        const { html } = await response.json();
        setRenderedHtml(html);
      } else {
        // Fallback to raw HTML
        setRenderedHtml(htmlContent);
      }

      setOpen(true);
    } catch (error) {
      console.error("Failed to generate preview:", error);
      toast.error("Failed to generate preview");
      setRenderedHtml(htmlContent);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={disabled || isLoading}
          className="gap-2"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Preview
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-w-[680px] flex-col border-none bg-transparent p-0 shadow-none max-md:h-full max-md:max-w-full max-md:p-2">
        <DialogHeader className="sr-only">
          <DialogTitle>Email Preview</DialogTitle>
          <DialogDescription>
            Preview of the email that recipients will receive
          </DialogDescription>
        </DialogHeader>

        {/* Email Header Card */}
        <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-semibold text-white">
            RC
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <h3 className="font-semibold text-gray-900">ReachDem Campaign</h3>
            <h4 className="text-sm font-medium text-gray-700">
              {subject || "Your Subject Goes Here"}
            </h4>
            <p className="text-sm text-gray-500">
              This is how your email will appear in the recipient's inbox
            </p>
          </div>
        </div>

        {/* Email Content Preview */}
        <div className="flex min-h-[70vh] w-full grow overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <EmailPreviewIFrame
            wrapperClassName="w-full"
            className="h-full w-full"
            innerHTML={renderedHtml || htmlContent}
            showOpenInNewTab={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
