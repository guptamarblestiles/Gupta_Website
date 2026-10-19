import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/Display";
import { TeamManager } from "@/components/team/TeamManager";

export const metadata: Metadata = { title: "Team & permissions" };

export default async function TeamPage() {
  const session = await requireRole("owner");
  const db = await createClient();
  const { data, error } = await db.from("admin_users").select("user_id, email, display_name, role, is_active, created_at").order("created_at");
  if (error) throw error;
  return (
    <>
      <PageHeader eyebrow="Admin" title="Team & permissions" description="Who can sign in to this admin, and what they can do. Only owners see this page." />
      <TeamManager members={data ?? []} selfId={session.userId} serviceKeyConfigured={Boolean(process.env.SUPABASE_SECRET_KEY)} />
    </>
  );
}
