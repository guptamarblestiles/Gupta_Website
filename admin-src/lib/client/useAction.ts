"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@admin/components/ui/Toast";
import { syncNote, type ActionResult } from "@admin/lib/actionResult";

/**
 * Runs a server action with: a pending flag, protection against double
 * submits (a second click while one is running is ignored), an honest toast
 * (saved / warning / website refresh status), and a router refresh.
 */
export function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const running = useRef(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<ActionResult<T>>, opts: { refresh?: boolean; quiet?: boolean } = {}): Promise<ActionResult<T> | null> => {
      if (running.current) return null;
      running.current = true;
      setPending(true);
      try {
        const result = await fn();
        if (!opts.quiet || !result.ok) {
          if (result.ok) {
            const note = result.publicSync && result.publicSync !== "not_needed" ? syncNote(result.publicSync) : undefined;
            toast({ tone: result.publicSync === "failed" ? "info" : "success", title: result.message, detail: note });
            if (result.warning) toast({ tone: "error", title: result.warning });
          } else {
            toast({ tone: "error", title: result.message });
          }
        }
        if (result.ok && opts.refresh !== false) router.refresh();
        return result;
      } catch {
        toast({
          tone: "error",
          title: navigator.onLine ? "The server didn't respond. Your change may not have been saved." : "You're offline. Nothing was saved.",
          detail: "Check your connection and try again.",
        });
        return null;
      } finally {
        running.current = false;
        setPending(false);
      }
    },
    [router, toast],
  );

  return { run, pending };
}
