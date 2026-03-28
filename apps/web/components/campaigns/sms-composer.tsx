"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Variable } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UrlHighlightedTextarea } from "./url-highlighted-textarea";
import { cn } from "@/lib/utils";

export interface SmsContent {
  text: string;
}

interface SmsComposerProps {
  value: SmsContent;
  onChange: (value: SmsContent) => void;
  disabled?: boolean;
}

const SMS_MAX_LENGTH = 160;

const AVAILABLE_VARIABLES = [
  { key: "{{firstName}}", label: "First Name" },
  { key: "{{lastName}}", label: "Last Name" },
  { key: "{{email}}", label: "Email" },
  { key: "{{phone}}", label: "Phone" },
];

// Generate a mock 4-character slug for preview
function generateMockSlug(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export function SmsComposer({
  value,
  onChange,
  disabled = false,
}: SmsComposerProps) {
  const [textareaElement, setTextareaElement] =
    useState<HTMLTextAreaElement | null>(null);

  const characterCount = value.text.length;
  const isOverLimit = characterCount > SMS_MAX_LENGTH;
  const remainingChars = SMS_MAX_LENGTH - characterCount;

  const handleTextChange = (text: string) => {
    onChange({ text });
  };

  const insertVariable = (variable: string) => {
    // Find the textarea element
    const textarea = document.getElementById(
      "sms-message"
    ) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = value.text.substring(0, start);
    const textAfter = value.text.substring(end);
    const newText = textBefore + variable + textAfter;

    onChange({ text: newText });

    // Set cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + variable.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  // Detect URLs in the message
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const detectedUrls = value.text.match(urlRegex) || [];

  return (
    <div className="space-y-4">
      {/* Message Input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="sms-message">Message</Label>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="gap-2"
                >
                  <Variable className="h-4 w-4" />
                  Insert Variable
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Available Variables</h4>
                  <div className="space-y-1">
                    {AVAILABLE_VARIABLES.map((variable) => (
                      <Button
                        key={variable.key}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start font-mono text-xs"
                        onClick={() => insertVariable(variable.key)}
                      >
                        <span className="text-primary">{variable.key}</span>
                        <span className="text-muted-foreground ml-2">
                          - {variable.label}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <UrlHighlightedTextarea
          id="sms-message"
          value={value.text}
          onChange={(text) => handleTextChange(text)}
          disabled={disabled}
          placeholder="Type your SMS message here..."
          className={cn(
            "min-h-[200px] resize-none font-sans",
            isOverLimit && "border-destructive focus-visible:ring-destructive"
          )}
        />

        {/* Character Counter */}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              "text-sm",
              isOverLimit
                ? "text-destructive font-medium"
                : "text-muted-foreground"
            )}
          >
            {characterCount}/{SMS_MAX_LENGTH} characters
            {remainingChars >= 0 && (
              <span className="ml-2">({remainingChars} remaining)</span>
            )}
            {isOverLimit && (
              <span className="ml-2">
                ({Math.abs(remainingChars)} over limit)
              </span>
            )}
          </div>
          <div className="text-muted-foreground text-xs">
            ~{Math.ceil(characterCount / 160)} SMS segment(s)
          </div>
        </div>
      </div>

      {/* Warning for over limit */}
      {isOverLimit && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your message exceeds the 160 character limit. Please shorten your
            message before sending.
          </AlertDescription>
        </Alert>
      )}

      {/* URL Detection Info */}
      {detectedUrls.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">
                {detectedUrls.length} URL(s) detected - will be shortened
                automatically
              </p>
              <p className="text-muted-foreground text-xs">
                Your links will be shortened to rcdm.ink/XXXX format (4
                characters) and tracked for clicks, devices, and regions.
              </p>
              <div className="mt-3 space-y-2">
                {detectedUrls.map((url, index) => (
                  <div
                    key={index}
                    className="bg-muted/50 flex flex-col gap-1 rounded-md p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Original:
                      </span>
                      <span className="truncate font-mono text-xs">{url}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Shortened:
                      </span>
                      <span className="font-mono text-xs text-blue-600">
                        rcdm.ink/{generateMockSlug()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* SMS Preview */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <div className="border-input bg-muted/30 rounded-lg border p-4">
          <div className="bg-background mx-auto max-w-sm rounded-lg border p-4 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-8 w-8 rounded-full" />
                <div className="text-sm font-medium">Your Business</div>
              </div>
              <div className="bg-muted rounded-lg rounded-tl-none p-3">
                <p className="text-sm whitespace-pre-wrap">
                  {value.text || "(Empty message)"}
                </p>
              </div>
              <div className="text-muted-foreground text-xs">Just now</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
