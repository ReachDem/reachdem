import { getMaintenanceMode } from "../broadcast/_actions/maintenance";
import { MaintenanceToggle } from "../broadcast/_components/maintenance-toggle";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const maintenance = await getMaintenanceMode();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="w-full max-w-3xl space-y-8 px-6 py-6">
        <div>
          <h1 className="text-foreground text-2xl font-bold tracking-tight">
            Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Platform configuration and operational controls.
          </p>
        </div>

        <section>
          <h2 className="text-foreground mb-4 text-base font-semibold">
            Maintenance mode
          </h2>
          <MaintenanceToggle initial={maintenance} />
        </section>
      </div>
    </div>
  );
}
