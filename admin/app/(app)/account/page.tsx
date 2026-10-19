import type { Metadata } from "next";
import { requireRole, ROLE_LABELS } from "@/lib/auth";
import { Card, CardHeader, PageHeader } from "@/components/ui/Display";
import { AccountForms } from "@/components/team/AccountForms";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const session = await requireRole("viewer");
  return (
    <>
      <PageHeader eyebrow="Admin" title="My account" />
      <div className="grid max-w-3xl gap-6">
        <Card>
          <CardHeader title="Signed in as" />
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 px-5 py-4 text-sm">
            <dt className="text-ink-muted">Email</dt>
            <dd>{session.email}</dd>
            <dt className="text-ink-muted">Role</dt>
            <dd>{ROLE_LABELS[session.role]}</dd>
          </dl>
        </Card>
        <AccountForms displayName={session.displayName ?? ""} />
      </div>
    </>
  );
}
