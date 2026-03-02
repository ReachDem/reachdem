import { SettingsSidebar } from "./settings-sidebar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SettingsSidebar>{children}</SettingsSidebar>
    </div>
  );
}
