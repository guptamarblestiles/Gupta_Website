"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@admin/components/ui/Button";
import { Card, EmptyState } from "@admin/components/ui/Display";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <Card>
      <EmptyState
        icon={<TriangleAlert className="size-5" />}
        title={offline ? "You're offline" : "This page couldn't load"}
        action={
          <Button variant="primary" onClick={reset} icon={<RefreshCw className="size-4" />}>
            Try again
          </Button>
        }
      >
        {offline
          ? "Check your internet connection, then try again. Nothing you saved earlier has been lost."
          : "The database didn't respond as expected. Try again in a moment. If it keeps happening, share this reference with whoever set up the site: "}
        {!offline && error.digest && <code className="rounded bg-sunken px-1.5 py-0.5 text-xs">{error.digest}</code>}
      </EmptyState>
    </Card>
  );
}
