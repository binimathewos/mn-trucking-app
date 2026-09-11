import { DefaultDriverRateCard } from "@/features/settings/components/default-driver-rate-card";
import { getDriverPaySettings } from "@/features/settings/data/driver-pay-settings-repository";

export default async function SettingsPage() {
  const settings = await getDriverPaySettings();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div>
        <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Administration / Settings
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-foreground">Settings</h1>
      </div>

      <DefaultDriverRateCard settings={settings} />
    </div>
  );
}
