"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Link2,
  Variable,
  Smartphone,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createTrackedLink } from "@/actions/links";
import { toast } from "sonner";
import { CheckCircle2, Info } from "lucide-react";

export interface SmsContent {
  text: string;
  senderId?: string;
}

interface SmsComposerProps {
  value: SmsContent;
  onChange: (value: SmsContent) => void;
  disabled?: boolean;
  /** The effective sender ID resolved from the organization (verified custom or default "ReachDem") */
  effectiveSenderId?: string;
  /** Whether the sender ID is a custom verified one (true) or the ReachDem default (false) */
  isCustomSender?: boolean;
}

// Common variables
const COMMON_VARIABLES = [
  { label: "First Name", value: "{{contact.firstName}}" },
  { label: "Last Name", value: "{{contact.lastName}}" },
  { label: "Full Name", value: "{{contact.name}}" },
  { label: "Email", value: "{{contact.email}}" },
  { label: "Phone", value: "{{contact.phone}}" },
  { label: "Company", value: "{{contact.company}}" },
];

// URL regex pattern - detects complete URLs (followed by space or at end)
const URL_REGEX =
  /((?:https?:\/\/|www\.|[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})(?:[^\s]*))/g;

// Variable regex pattern
const VARIABLE_REGEX = /\{\{[^}]+\}\}/g;

interface DetectedUrl {
  url: string;
  start: number;
  end: number;
  isSecure: boolean;
}

export function SmsComposerNew({
  value,
  onChange,
  disabled = false,
  effectiveSenderId = "ReachDem",
  isCustomSender = false,
}: SmsComposerProps) {
  const [detectedUrls, setDetectedUrls] = useState<DetectedUrl[]>([]);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [shortenedUrls, setShortenedUrls] = useState<Map<string, string>>(
    new Map()
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect URLs and variables
  useEffect(() => {
    const text = value.text || "";

    // First, detect variables to exclude them from URL detection
    const variables = text.match(VARIABLE_REGEX) || [];
    setDetectedVariables([...new Set(variables)]);

    // Create a map of variable positions to exclude
    const variablePositions = new Set<number>();
    variables.forEach((variable) => {
      let index = text.indexOf(variable);
      while (index !== -1) {
        for (let i = index; i < index + variable.length; i++) {
          variablePositions.add(i);
        }
        index = text.indexOf(variable, index + 1);
      }
    });

    // Detect complete URLs (followed by space or at end), excluding variables and already shortened links
    const urlsInfo: DetectedUrl[] = [];
    let match;
    const regex = new RegExp(URL_REGEX);

    while ((match = regex.exec(text)) !== null) {
      const url = match[1];
      const start = match.index;
      const end = start + url.length;

      // Skip if this position overlaps with a variable
      let overlapsVariable = false;
      for (let i = start; i < end; i++) {
        if (variablePositions.has(i)) {
          overlapsVariable = true;
          break;
        }
      }

      if (overlapsVariable) continue;

      // Skip if this is already a shortened rcdm.ink link
      if (url.includes("rcdm.ink/")) continue;

      // Check if it's followed by space or end of string (complete URL)
      const isComplete = end === text.length || /\s/.test(text[end]);

      if (isComplete) {
        const isHttp = url.startsWith("http://");

        urlsInfo.push({
          url,
          start,
          end,
          isSecure: !isHttp, // Only HTTP is insecure
        });
      }
    }

    setDetectedUrls(urlsInfo);
  }, [value.text]);

  // Auto-shorten URLs
  useEffect(() => {
    if (detectedUrls.length > 0) {
      detectedUrls.forEach((urlInfo) => {
        if (!shortenedUrls.has(urlInfo.url)) {
          generatePreviewSlug(urlInfo.url);
        }
      });
    }
  }, [detectedUrls]);

  // Generate preview slug (not saved yet)
  const generatePreviewSlug = (url: string) => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const slug = Array.from(
      { length: 4 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    const shortUrl = `rcdm.ink/${slug}`;
    setShortenedUrls((prev) => new Map(prev).set(url, shortUrl));
  };

  // Replace URL in textarea with preview short URL and create tracked link
  const replaceUrlInText = async (
    originalUrl: string,
    previewShortUrl: string
  ) => {
    try {
      // Extract slug from preview
      const slug = previewShortUrl.split("/").pop() || "";

      // Create tracked link via API with the preview slug
      const trackedLink = await createTrackedLink({
        targetUrl: originalUrl,
        slug, // Use the preview slug
        channel: "sms",
      });

      // Replace in textarea with the actual short URL from API
      const newText = (value.text || "").replace(
        originalUrl,
        trackedLink.shortUrl
      );
      handleTextChange(newText);

      // Update shortened URLs map with real short URL
      setShortenedUrls((prev) =>
        new Map(prev).set(originalUrl, trackedLink.shortUrl)
      );

      toast.success("Link shortened and tracked");
    } catch (error: any) {
      console.error("Error creating tracked link:", error);

      // If conflict (409), generate a new slug and retry
      if (
        error.message?.includes("409") ||
        error.message?.includes("Conflict")
      ) {
        const chars =
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const newSlug = Array.from(
          { length: 4 },
          () => chars[Math.floor(Math.random() * chars.length)]
        ).join("");

        try {
          const trackedLink = await createTrackedLink({
            targetUrl: originalUrl,
            slug: newSlug,
            channel: "sms",
          });

          const newText = (value.text || "").replace(
            originalUrl,
            trackedLink.shortUrl
          );
          handleTextChange(newText);
          setShortenedUrls((prev) =>
            new Map(prev).set(originalUrl, trackedLink.shortUrl)
          );
          toast.success("Link shortened and tracked");
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          toast.error("Failed to shorten link");
        }
      } else {
        toast.error("Failed to shorten link");
      }
    }
  };

  const handleTextChange = (text: string) => {
    onChange({ ...value, text });
  };

  const handleSenderIdChange = (senderId: string) => {
    onChange({ ...value, senderId });
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = value.text || "";
    const newText = text.substring(0, start) + variable + text.substring(end);

    handleTextChange(newText);

    // Set cursor position after variable
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + variable.length,
        start + variable.length
      );
    }, 0);
  };

  const characterCount = (value.text || "").length;
  const maxCharacters = 160;
  const segmentSize = 160;
  const segments = Math.ceil(characterCount / segmentSize);
  const isOverLimit = characterCount > maxCharacters;

  // Replace URLs with shortened versions for preview
  const getPreviewText = () => {
    let previewText = value.text || "";
    detectedUrls.forEach((urlInfo) => {
      const shortUrl = shortenedUrls.get(urlInfo.url);
      if (shortUrl) {
        previewText = previewText.replace(urlInfo.url, shortUrl);
      }
    });
    return previewText;
  };

  // Replace variables with example values for preview
  const getRenderedPreview = () => {
    let rendered = getPreviewText();
    rendered = rendered.replace(/\{\{contact\.firstName\}\}/g, "John");
    rendered = rendered.replace(/\{\{contact\.lastName\}\}/g, "Doe");
    rendered = rendered.replace(/\{\{contact\.name\}\}/g, "John Doe");
    rendered = rendered.replace(/\{\{contact\.email\}\}/g, "john@example.com");
    rendered = rendered.replace(/\{\{contact\.phone\}\}/g, "+1234567890");
    rendered = rendered.replace(/\{\{contact\.company\}\}/g, "Acme Inc");
    return rendered;
  };

  // Render preview with highlighted URLs
  const renderPreviewWithHighlights = () => {
    const text = getRenderedPreview();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Find all shortened URLs in the preview text
    detectedUrls.forEach((urlInfo, index) => {
      const shortUrl = shortenedUrls.get(urlInfo.url);
      if (!shortUrl) return;

      const shortUrlIndex = text.indexOf(shortUrl, lastIndex);
      if (shortUrlIndex === -1) return;

      // Add text before URL
      if (shortUrlIndex > lastIndex) {
        parts.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, shortUrlIndex)}
          </span>
        );
      }

      // Add highlighted shortened URL
      parts.push(
        <span
          key={`url-${index}`}
          className={cn(
            "rounded-sm px-1 font-medium",
            urlInfo.isSecure
              ? "bg-blue-500/30 text-blue-400"
              : "bg-red-500/30 text-red-400"
          )}
        >
          {shortUrl}
        </span>
      );

      lastIndex = shortUrlIndex + shortUrl.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left side - Editor */}
        <div className="space-y-4">
          {/* Sender ID — read-only, resolved from org settings */}
          <div className="space-y-2">
            <Label htmlFor="sender-id">Sender ID</Label>
            <div className="flex items-center gap-2">
              <div
                id="sender-id"
                className="bg-muted/60 border-input flex h-9 flex-1 items-center rounded-md border px-3 font-mono text-sm font-semibold tracking-widest uppercase"
              >
                {effectiveSenderId}
              </div>
              {isCustomSender ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center">
                        <CheckCircle2 className="size-4 text-emerald-500" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Your verified Sender ID</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center">
                        <Info className="text-muted-foreground size-4" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        Default sender. Configure a custom Sender ID in
                        Workspace Settings.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {isCustomSender
                ? "Your verified Sender ID. Recipients will see this name."
                : "Using the default sender. Go to Settings → Workspace to request a custom Sender ID."}
            </p>
          </div>

          {/* Message textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-message">Message</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2"
                    disabled={disabled}
                  >
                    <Variable className="h-4 w-4" />
                    Insert Variable
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Insert Variable</p>
                    <div className="grid gap-2">
                      {COMMON_VARIABLES.map((variable) => (
                        <Button
                          key={variable.value}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="justify-start font-mono text-xs"
                          onClick={() => insertVariable(variable.value)}
                        >
                          {variable.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <textarea
              ref={textareaRef}
              id="sms-message"
              placeholder="Type your SMS message here... Use {{contact.name}} for variables."
              value={value.text || ""}
              onChange={(e) => handleTextChange(e.target.value)}
              disabled={disabled}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[200px] w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              maxLength={maxCharacters}
            />

            {/* Character count */}
            <div className="flex items-center justify-between text-xs">
              <span
                className={cn(
                  "font-medium",
                  isOverLimit ? "text-destructive" : "text-muted-foreground"
                )}
              >
                {characterCount} / {maxCharacters} characters
              </span>
              <span className="text-muted-foreground">
                ~{segments} SMS segment{segments !== 1 ? "s" : ""}
              </span>
            </div>

            {isOverLimit && (
              <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-md p-3 text-sm">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Message exceeds maximum length of {maxCharacters} characters.
                </p>
              </div>
            )}
          </div>

          {/* Detected URLs */}
          {detectedUrls.length > 0 && (
            <div className="bg-muted/50 space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Link2 className="h-4 w-4" />
                Detected URLs ({detectedUrls.length})
              </div>
              <div className="space-y-2">
                {detectedUrls.map((urlInfo, index) => {
                  const shortUrl = shortenedUrls.get(urlInfo.url);
                  return (
                    <div
                      key={index}
                      className="bg-background flex items-center gap-2 rounded-md p-2"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="text-muted-foreground truncate font-mono text-xs">
                          {urlInfo.url}
                        </div>
                        {shortUrl && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs">
                              →
                            </span>
                            <span
                              className={cn(
                                "font-mono text-xs font-medium",
                                urlInfo.isSecure
                                  ? "text-blue-600"
                                  : "text-red-600"
                              )}
                            >
                              {shortUrl}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!urlInfo.isSecure && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  Ce lien n'est pas protégé (HTTP)
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {shortUrl ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              replaceUrlInText(urlInfo.url, shortUrl)
                            }
                          >
                            Replace
                          </Button>
                        ) : (
                          <Badge
                            variant="outline"
                            className="animate-pulse text-xs"
                          >
                            Loading...
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detected Variables */}
          {detectedVariables.length > 0 && (
            <div className="bg-muted/50 space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Variable className="h-4 w-4" />
                Variables ({detectedVariables.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {detectedVariables.map((variable, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="font-mono text-xs"
                  >
                    {variable}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right side - Phone Preview */}
        <div className="flex items-start justify-center lg:justify-end">
          <PhoneMockup
            senderId={effectiveSenderId}
            message={getRenderedPreview()}
            highlightedMessage={renderPreviewWithHighlights()}
          />
        </div>
      </div>
    </div>
  );
}

// Phone mockup component
function PhoneMockup({
  senderId,
  message,
  highlightedMessage,
}: {
  senderId: string;
  message: string;
  highlightedMessage: React.ReactNode;
}) {
  return (
    <div className="relative w-[320px]">
      {/* Phone frame */}
      <div className="relative rounded-[3rem] border-[14px] border-gray-800 bg-gray-900 shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 h-7 w-40 -translate-x-1/2 rounded-b-3xl bg-gray-800" />

        {/* Screen */}
        <div className="relative h-[600px] overflow-hidden rounded-[2.3rem] bg-black">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-2">
            <div className="text-xs font-semibold text-white">9:41</div>
            <div className="flex items-center gap-1">
              <div className="h-3 w-4">
                <svg viewBox="0 0 16 12" fill="white">
                  <path d="M0 4h4v4H0V4zm6 0h4v4H6V4zm6 0h4v4h-4V4z" />
                </svg>
              </div>
              <div className="h-3 w-4">
                <svg viewBox="0 0 16 12" fill="white">
                  <path d="M2 0C.9 0 0 .9 0 2v8c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2H2zm0 2h12v8H2V2z" />
                </svg>
              </div>
              <div className="h-3 w-6">
                <svg viewBox="0 0 24 12" fill="white">
                  <rect x="0" y="0" width="18" height="12" rx="2" />
                  <rect x="20" y="3" width="4" height="6" rx="1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Messages app */}
          <div className="h-full bg-black px-4 pt-2">
            {/* Header */}
            <div className="mb-4 flex items-center gap-3 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">MESSAGES</div>
                <div className="text-xs text-gray-400">Now</div>
              </div>
            </div>

            {/* Message bubble */}
            <div className="rounded-2xl bg-gray-800 p-4">
              <div className="mb-2 text-xs font-semibold text-gray-400">
                {senderId}
              </div>
              <div className="text-sm leading-relaxed text-gray-200">
                {message ? (
                  <span className="whitespace-pre-wrap">
                    {highlightedMessage}
                  </span>
                ) : (
                  <span className="text-gray-500 italic">
                    Your message will appear here...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
