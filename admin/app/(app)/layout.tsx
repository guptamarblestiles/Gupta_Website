import { AppShell } from "@/components/shell/AppShell";
import { requireRole, roleAtLeast, ROLE_LABELS } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEMO } from "@/lib/demo/mode";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("viewer");
  let newEnquiries = 0;
  if (roleAtLeast(session.role, "editor")) {
    const db = await createClient();
    const { count } = await db.from("enquiries").select("id", { count: "exact", head: true }).eq("status", "new");
    newEnquiries = count ?? 0;
  }
  return (
    <AppShell
      newEnquiries={newEnquiries}
      demo={DEMO}
      user={{
        name: session.displayName || session.email.split("@")[0],
        email: session.email,
        role: session.role,
        roleLabel: ROLE_LABELS[session.role],
      }}
    >
      {children}
    </AppShell>
  );
}
