import * as React from "react";
import { cn } from "@/lib/utils";

const SettingsCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden",
      className,
    )}
    {...props}
  />
));
SettingsCard.displayName = "SettingsCard";

const SettingsCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6 border-b", className)}
    {...props}
  />
));
SettingsCardHeader.displayName = "SettingsCardHeader";

const SettingsCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
SettingsCardTitle.displayName = "SettingsCardTitle";

const SettingsCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
SettingsCardDescription.displayName = "SettingsCardDescription";

const SettingsCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0 bg-muted/20", className)} {...props} />
));
SettingsCardContent.displayName = "SettingsCardContent";

const SettingsCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center justify-between p-4 bg-muted/40 border-t text-sm text-muted-foreground",
      className,
    )}
    {...props}
  />
));
SettingsCardFooter.displayName = "SettingsCardFooter";

export {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardFooter,
  SettingsCardTitle,
  SettingsCardDescription,
  SettingsCardContent,
};
