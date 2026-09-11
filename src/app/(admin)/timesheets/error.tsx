"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TimesheetsError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 py-24 text-center">
      <AlertTriangle className="size-8 text-destructive" aria-hidden="true" />
      <h2 className="text-xl font-semibold text-foreground">Couldn&apos;t load timesheets</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Something went wrong while loading driver timesheets. Try again, or come back later.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
