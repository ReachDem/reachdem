"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Variable } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
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

export function SmsComposer({
  value,
  onChange,
  disabled = false,
}: SmsComposerProps) {
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useState<HTMLTextAreaElement | null>(null);

  const characterCount = value.text.length;
  const isOverLimit = characterCount > SMS_MAX_LENGTH;
  const remainingChars = SMS_MAX_LENGTH - characterCount;

  const handleTextChange = (text: string) => {
    onChange({ text });
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef[0];
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

        <Textarea
          id="sms-message"
          ref={(el) => {
            textareaRef[0] = el;
          }}
          value={value.text}
          onChange={(e) => handleTextChange(e.target.value)}
          onSelect={(e) => {
            const target = e.target as HTMLTextAreaElement;
            setCursorPosition(target.selectionStart);
          }}
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
            <div className="space-y-1">
              <p className="font-medium">
                {detectedUrls.length} URL(s) detected in your message
              </p>
              <p className="text-xs">
                URLs will be automatically shortened and tracked when the
                campaign is sent.
              </p>
              <ul className="mt-2 space-y-1">
                {detectedUrls.map((url, index) => (
                  <li key={index} className="font-mono text-xs">
                    • {url}
                  </li>
                ))}
              </ul>
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
