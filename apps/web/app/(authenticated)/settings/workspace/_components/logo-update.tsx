"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@reachdem/auth/client";

interface LogoUpdateProps {
  initialLogo?: string | null;
  orgId: string;
}

export function LogoUpdate({ initialLogo, orgId }: LogoUpdateProps) {
  const [logo, setLogo] = useState<string | null>(initialLogo || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "organization");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload image");
      }

      const data = await response.json();

      // Update organization logo via BetterAuth
      await authClient.organization.update({
        organizationId: orgId,
        data: {
          logo: data.url,
        },
      });

      setLogo(data.url);
      toast.success("Logo updated successfully");
    } catch (error: any) {
      toast.error(error.message || "An error occurred");
    } finally {
      setIsUploading(false);
      // Reset input value so the same file could be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex items-center gap-4">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      {logo ? (
        <Avatar className="border-foreground/20 h-10 w-10 rounded-md border">
          <AvatarImage
            src={logo}
            alt="Organization Logo"
            className="object-cover"
          />
          <AvatarFallback className="rounded-md bg-transparent text-xs">
            Logo
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="border-foreground/30 flex h-10 w-16 items-center justify-center rounded-md border bg-transparent">
          <Upload className="text-muted-foreground h-4 w-4" />
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
        className="border-foreground/30 h-8 rounded-md px-4 font-normal"
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading
          </>
        ) : logo ? (
          "Change logo"
        ) : (
          "Upload logo"
        )}
      </Button>
    </div>
  );
}
