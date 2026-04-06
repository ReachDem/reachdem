"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  approveKybVerification,
  getKybDownloadUrls,
  rejectKybVerification,
} from "@/actions/kyb-admin";
import { cn } from "@/lib/utils";

interface KybActionsProps {
  organizationId: string;
  organizationName: string;
  ownerEmail: string;
  websiteUrl: string | null;
  idDocumentKey: string | null;
  businessDocumentKey: string | null;
  verificationStatus: "not_submitted" | "pending" | "verified" | "rejected";
}

const STATUS_STYLES: Record<KybActionsProps["verificationStatus"], string> = {
  not_submitted: "border-muted text-muted-foreground",
  pending: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  verified: "border-emerald-400/30 bg-emerald-400/10 text-emerald-400",
  rejected: "border-red-400/30 bg-red-400/10 text-red-400",
};

export function KybActions({
  organizationId,
  organizationName,
  ownerEmail,
  websiteUrl,
  idDocumentKey,
  businessDocumentKey,
  verificationStatus,
}: KybActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [documentUrls, setDocumentUrls] = useState<{
    idUrl: string | null;
    bizUrl: string | null;
  }>({
    idUrl: null,
    bizUrl: null,
  });

  const canReview =
    verificationStatus === "pending" || verificationStatus === "rejected";

  const normalizedWebsiteUrl =
    websiteUrl && /^https?:\/\//i.test(websiteUrl)
      ? websiteUrl
      : websiteUrl
        ? `https://${websiteUrl}`
        : null;

  const normalizeUrl = (value: string | undefined) => {
    if (!value) {
      return null;
    }

    try {
      return new URL(value).toString();
    } catch {
      return null;
    }
  };

  const loadDocumentUrls = useCallback(async () => {
    if (!idDocumentKey && !businessDocumentKey) {
      return;
    }

    try {
      setIsLoadingDocuments(true);
      const res = await getKybDownloadUrls(idDocumentKey, businessDocumentKey);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      const nextUrls = {
        idUrl: normalizeUrl(res.urls?.idUrl),
        bizUrl: normalizeUrl(res.urls?.bizUrl),
      };

      setDocumentUrls(nextUrls);

      if (
        (idDocumentKey && !nextUrls.idUrl) ||
        (businessDocumentKey && !nextUrls.bizUrl)
      ) {
        toast.error("Some document links could not be generated correctly");
      }
    } catch {
      toast.error("Failed to retrieve documents");
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [businessDocumentKey, idDocumentKey]);

  useEffect(() => {
    if (!open) {
      setDocumentUrls({ idUrl: null, bizUrl: null });
      return;
    }

    void loadDocumentUrls();
  }, [loadDocumentUrls, open]);

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      const result = await approveKybVerification(organizationId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.warning ?? "Organization verification approved");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to approve verification");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      const trimmedReason = rejectReason.trim();

      if (!trimmedReason) {
        toast.error("Please provide a rejection reason");
        return;
      }

      setIsRejecting(true);
      const result = await rejectKybVerification(organizationId, trimmedReason);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(result.warning ?? "Organization verification rejected");
      setRejectReason("");
      setShowRejectReason(false);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Failed to reject verification");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Eye className="mr-1.5 size-3" />
        View Submission
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setShowRejectReason(false);
            setRejectReason("");
            setDocumentUrls({ idUrl: null, bizUrl: null });
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-[min(94vw,980px)] overflow-y-auto p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle>Review verification submission</DialogTitle>
            <DialogDescription>
              Review the website, documents, and current status for{" "}
              {organizationName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={`capitalize ${STATUS_STYLES[verificationStatus]}`}
              >
                {verificationStatus.replace("_", " ")}
              </Badge>
              <span className="text-muted-foreground text-sm">
                {ownerEmail}
              </span>
            </div>

            <div className="grid gap-5 md:grid-cols-[1.15fr_1fr]">
              <div className="bg-muted/30 min-h-[240px] rounded-xl border p-5">
                <p className="text-sm font-medium">Website or social page</p>
                <p className="text-muted-foreground mt-2 text-sm leading-6 break-all">
                  {websiteUrl ?? "No website submitted"}
                </p>

                {normalizedWebsiteUrl ? (
                  <a
                    href={normalizedWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "border-border bg-background hover:bg-muted mt-4 inline-flex h-8 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] border px-2.5 text-[0.8rem] font-medium transition-colors"
                    )}
                  >
                    <ExternalLink className="size-3.5" />
                    Open website
                  </a>
                ) : null}
              </div>

              <div className="bg-muted/30 min-h-[240px] rounded-xl border p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Submitted documents</p>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      Preview each document in a new tab.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadDocumentUrls}
                    disabled={isLoadingDocuments}
                  >
                    {isLoadingDocuments ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="mr-1.5 size-3" />
                        Refresh
                      </>
                    )}
                  </Button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="bg-background flex items-center justify-between rounded-lg border px-3 py-3">
                    <span className="text-sm">ID document</span>
                    {documentUrls.idUrl ? (
                      <a
                        href={documentUrls.idUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[#ff751f] underline-offset-4 hover:underline"
                      >
                        Open
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {idDocumentKey ? "Link unavailable" : "Not submitted"}
                      </span>
                    )}
                  </div>

                  <div className="bg-background flex items-center justify-between rounded-lg border px-3 py-3">
                    <span className="text-sm">Business document</span>
                    {documentUrls.bizUrl ? (
                      <a
                        href={documentUrls.bizUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[#ff751f] underline-offset-4 hover:underline"
                      >
                        Open
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {businessDocumentKey
                          ? "Link unavailable"
                          : "Not submitted"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {showRejectReason ? (
              <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <CircleAlert className="size-4 text-amber-500" />
                  Rejection reason
                </div>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={5}
                  placeholder="Explain clearly what needs to be updated before this organization can be approved."
                  disabled={isApproving || isRejecting}
                />
              </div>
            ) : null}
          </div>

          <DialogFooter className="justify-between sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {canReview ? (
                <>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={isApproving || isRejecting}
                  >
                    {isApproving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="mr-1.5 size-3" />
                        Approve
                      </>
                    )}
                  </Button>

                  {!showRejectReason ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRejectReason(true)}
                      disabled={isApproving || isRejecting}
                    >
                      <XCircle className="mr-1.5 size-3" />
                      Reject
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReject}
                      disabled={isApproving || isRejecting}
                    >
                      {isRejecting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          <XCircle className="mr-1.5 size-3" />
                          Submit rejection
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  This submission is already finalized.
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isApproving || isRejecting}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
