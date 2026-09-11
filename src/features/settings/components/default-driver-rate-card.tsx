"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { updateDefaultHourlyRateAction } from "@/features/settings/actions/driver-pay-settings-actions";
import type { DriverPaySettingsRow } from "@/features/settings/types";

interface DefaultDriverRateCardProps {
  settings: DriverPaySettingsRow;
}

export function DefaultDriverRateCard({ settings }: DefaultDriverRateCardProps) {
  const router = useRouter();
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(settings.defaultHourlyRate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await updateDefaultHourlyRateAction({ defaultHourlyRate });
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Could not save the default rate. Enter a valid, non-negative rate.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Default driver hourly rate</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            New routes are prepopulated with this rate. Existing routes are never affected.
          </p>
        </div>
        <span
          className="flex size-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600"
          aria-hidden="true"
        >
          <DollarSign className="size-4.5" />
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <label className="flex max-w-xs flex-col gap-1 text-sm font-medium text-foreground">
          Hourly rate
          <Input
            value={defaultHourlyRate}
            onChange={(event) => {
              setDefaultHourlyRate(event.target.value);
              setSuccess(false);
            }}
            placeholder="22.00"
            aria-invalid={Boolean(error)}
          />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && !error && <p className="text-sm text-emerald-600">Default rate saved.</p>}

        <Button onClick={handleSave} disabled={isSubmitting || !defaultHourlyRate} className="w-full sm:w-auto">
          <Check className="size-4" aria-hidden="true" />
          {isSubmitting ? "Saving…" : "Save default rate"}
        </Button>
      </CardContent>
    </Card>
  );
}
