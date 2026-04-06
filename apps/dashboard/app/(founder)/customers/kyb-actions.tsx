"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  approveKybVerification,
  getKybDownloadUrls,
  rejectKybVerification,
} from "@/actions/kyb-admin";

interface KybActionsProps {
  organizationId: string;
  websiteUrl: string | null;
  idDocumentKey: string | null;
  businessDocumentKey: string | null;
  verificationStatus: "not_submitted" | "pending" | "verified" | "rejected";
}

export function KybActions({
  organizationId,
  websiteUrl,
  idDocumentKey,
  businessDocumentKey,
  verificationStatus,
}: KybActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleDownloadDocs = async () => {
    if (!idDocumentKey && !businessDocumentKey) {
      toast.error("No documents found for this organization");
      return;
    }

    try {
      setIsLoading(true);
      const res = await getKybDownloadUrls(idDocumentKey, businessDocumentKey);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      if (res.urls?.idUrl) window.open(res.urls.idUrl, "_blank");
      if (res.urls?.bizUrl) window.open(res.urls.bizUrl, "_blank");

      toast.success("Opened documents in new tabs");
    } catch (e) {
      toast.error("Failed to retrieve documents");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      setIsApproving(true);
      const result = await approveKybVerification(organizationId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Organization verification approved");
      router.refresh();
    } catch {
      toast.error("Failed to approve verification");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setIsRejecting(true);
      const result = await rejectKybVerification(organizationId);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Organization verification rejected");
      router.refresh();
    } catch {
      toast.error("Failed to reject verification");
    } finally {
      setIsRejecting(false);
    }
  };

  const canReview =
    verificationStatus === "pending" || verificationStatus === "rejected";

  return (
    <div className="flex items-center justify-end gap-2">
      {websiteUrl ? (
        <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm">
            <ExternalLink className="mr-1.5 size-3" />
            Website
          </Button>
        </a>
      ) : (
        <span className="text-muted-foreground mr-2 text-xs">No site</span>
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={handleDownloadDocs}
        disabled={isLoading || (!idDocumentKey && !businessDocumentKey)}
      >
        {isLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <Download className="mr-1.5 size-3" />
            Docs
          </>
        )}
      </Button>

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
                Reject
              </>
            )}
          </Button>
        </>
      ) : null}
    </div>
  );
}
