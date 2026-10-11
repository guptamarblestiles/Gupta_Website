"use client";

import { useTransition } from "react";
import { FlaskConical } from "lucide-react";
import { resetDemoData, setDemoRole } from "@/actions/demo";
import type { AdminRole } from "@/lib/auth";
import { cn } from "@/lib/cn";

const ROLES: { key: AdminRole; label: string }[] = [
  { key: "owner", label: "Owner" },
  { key: "editor", label: "Editor" },
  { key: "viewer", label: "Read-only" },
];

export function DemoBanner({ role }: { role: AdminRole }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-info px-4 py-2 text-sm text-white sm:px-6 lg:px-10" role="status">
      <span className="flex items-center gap-2 font-medium">
        <FlaskConical className="size-4" aria-hidden /> Demo mode
      </span>
      <span className="text-white/80">Sample data in memory. Nothing reaches the real database, storage or website.</span>
      <span className="ml-auto flex items-center gap-1" aria-busy={pending}>
        <span className="mr-1 text-white/80">View as</span>
        {ROLES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => start(() => setDemoRole(r.key))}
            aria-pressed={role === r.key}
            className={cn("rounded-full px-2.5 py-0.5", role === r.key ? "bg-white font-medium text-info" : "hover:bg-white/15")}
          >
            {r.label}
          </button>
        ))}
        <button type="button" onClick={() => start(() => resetDemoData())} className="ml-2 rounded-full px-2.5 py-0.5 hover:underline">
          Reset data
        </button>
      </span>
    </div>
  );
}
