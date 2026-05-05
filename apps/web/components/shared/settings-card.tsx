import * as React from "react";
import { cn } from "@/lib/utils";

const SettingsCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-card text-card-foreground overflow-hidden rounded-xl border shadow-sm",
      className
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
    className={cn("flex flex-col space-y-1.5 border-b p-6", className)}
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
    className={cn("text-lg leading-none font-medium tracking-tight", className)}
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
    className={cn("text-muted-foreground text-sm", className)}
    {...props}
  />
));
SettingsCardDescription.displayName = "SettingsCardDescription";

const SettingsCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("bg-muted/20 p-6 pt-0", className)} {...props} />
));
SettingsCardContent.displayName = "SettingsCardContent";

const SettingsCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-muted/40 text-muted-foreground flex items-center justify-between border-t p-4 text-sm",
      className
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
