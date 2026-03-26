"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2, Variable, Smartphone, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface SmsContent {
  text: string;
  senderId?: string;
}

interface SmsComposerProps {
  value: SmsContent;
  onChange: (value: SmsContent) => void;
  disabled?: boolean;
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

// URL regex pattern
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

// Variable regex pattern
const VARIABLE_REGEX = /\{\{[^}]+\}\}/g;

export function SmsComposerNew({
  value,
  onChange,
  disabled = false,
}: SmsComposerProps) {
  const [detectedUrls, setDetectedUrls] = useState<string[]>([]);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [shortenedUrls, setShortenedUrls] = useState<Map<string, string>>(
    new Map()
  );
  const [isShortening, setIsShortening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect URLs and variables
  useEffect(() => {
    const text = value.text || "";

    // Detect URLs
    const urls = text.match(URL_REGEX) || [];
    setDetectedUrls([...new Set(urls)]);

    // Detect variables
    const variables = text.match(VARIABLE_REGEX) || [];
    setDetectedVariables([...new Set(variables)]);
  }, [value.text]);

  // Auto-shorten URLs
  useEffect(() => {
    if (detectedUrls.length > 0 && !isShortening) {
      detectedUrls.forEach((url) => {
        if (!shortenedUrls.has(url)) {
          shortenUrl(url);
        }
      });
    }
  }, [detectedUrls]);

  const shortenUrl = async (url: string) => {
    setIsShortening(true);
    try {
      // Simulate URL shortening with animation
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Generate a fake shortened URL (in production, call your URL shortening API)
      const shortUrl = `https://reach.dm/${Math.random().toString(36).substring(2, 8)}`;

      setShortenedUrls((prev) => new Map(prev).set(url, shortUrl));
    } catch (error) {
      console.error("Error shortening URL:", error);
    } finally {
      setIsShortening(false);
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
  const maxCharacters = 1600;
  const segmentSize = 160;
  const segments = Math.ceil(characterCount / segmentSize);
  const isOverLimit = characterCount > maxCharacters;

  // Replace URLs with shortened versions for preview
  const getPreviewText = () => {
    let previewText = value.text || "";
    shortenedUrls.forEach((shortUrl, originalUrl) => {
      previewText = previewText.replace(originalUrl, shortUrl);
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left side - Editor */}
        <div className="space-y-4">
          {/* Sender ID */}
          <div className="space-y-2">
            <Label htmlFor="sender-id">Sender ID</Label>
            <Input
              id="sender-id"
              placeholder="e.g., YourBrand"
              value={value.senderId || ""}
              onChange={(e) => handleSenderIdChange(e.target.value)}
              disabled={disabled}
              maxLength={11}
              className="font-mono"
            />
            <p className="text-muted-foreground text-xs">
              Max 11 characters. This is how your name appears to recipients.
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

            <Textarea
              ref={textareaRef}
              id="sms-message"
              placeholder="Type your SMS message here... Use {{contact.name}} for variables."
              value={value.text || ""}
              onChange={(e) => handleTextChange(e.target.value)}
              disabled={disabled}
              className="min-h-[200px] resize-none font-sans"
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
                {detectedUrls.map((url, index) => {
                  const shortUrl = shortenedUrls.get(url);
                  return (
                    <div
                      key={index}
                      className="bg-background flex items-center gap-2 rounded-md p-2 text-xs"
                    >
                      <div className="text-muted-foreground flex-1 truncate font-mono">
                        {url}
                      </div>
                      <div className="flex items-center gap-2">
                        {shortUrl ? (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-primary font-mono">
                              {shortUrl}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              Shortened
                            </Badge>
                          </>
                        ) : (
                          <Badge
                            variant="outline"
                            className="animate-pulse text-xs"
                          >
                            Shortening...
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
            senderId={value.senderId || "SENDER"}
            message={getRenderedPreview()}
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
}: {
  senderId: string;
  message: string;
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
                {message || (
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
