"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardHeader, Notice } from "@/components/ui/Display";
import { ConfirmDialog, Dialog } from "@/components/ui/Dialog";
import { Field, Input, Select } from "@/components/ui/Field";
import { useAction } from "@/lib/client/useAction";
import { addTeamMember, removeTeamMember, updateTeamMember } from "@/actions/team";
import type { AdminRole } from "@/lib/auth";

const ROLE_INFO: Record<AdminRole, { label: string; text: string }> = {
  owner: { label: "Owner", text: "Everything, including deleting and managing the team." },
  editor: { label: "Editor", text: "Add and edit products, PDFs, images, categories and enquiries. Can't delete permanently or manage the team." },
  viewer: { label: "Read-only", text: "Can look at the catalogue and activity, but can't change anything or see customer enquiries." },
};

type Member = { user_id: string; email: string; display_name: string | null; role: AdminRole; is_active: boolean };

export function TeamManager({ members, selfId, serviceKeyConfigured }: { members: Member[]; selfId: string; serviceKeyConfigured: boolean }) {
  const { run, pending } = useAction();
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AdminRole>("editor");
  const [removing, setRemoving] = useState<Member | null>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Team members"
          action={
            <Button size="sm" variant="primary" icon={<UserPlus className="size-4" />} onClick={() => setAdding(true)} disabled={!serviceKeyConfigured}>
              Add person
            </Button>
          }
        />
        {!serviceKeyConfigured && (
          <Notice tone="warning" className="m-4">
            Adding people needs SUPABASE_SECRET_KEY on the admin deployment. Roles of existing members can still be changed.
          </Notice>
        )}
        <ul className="divide-y divide-line">
          {members.map((m) => {
            const self = m.user_id === selfId;
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.display_name || m.email}</span>
                    {self && <Badge tone="copper">You</Badge>}
                    {!m.is_active && <Badge tone="danger">Access paused</Badge>}
                  </div>
                  <div className="text-xs text-ink-faint">{m.email}</div>
                </div>
                {self ? (
                  <span className="text-sm text-ink-muted">{ROLE_INFO[m.role].label}</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`role-${m.user_id}`}>
                      Role for {m.email}
                    </label>
                    <Select
                      id={`role-${m.user_id}`}
                      value={m.role}
                      onChange={(e) => run(() => updateTeamMember(m.user_id, { role: e.target.value as AdminRole }))}
                      disabled={pending}
                      className="h-9 w-36 text-sm"
                    >
                      {(Object.keys(ROLE_INFO) as AdminRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_INFO[r].label}
                        </option>
                      ))}
                    </Select>
                    <Button size="sm" onClick={() => run(() => updateTeamMember(m.user_id, { is_active: !m.is_active }))} disabled={pending}>
                      {m.is_active ? "Pause" : "Restore"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-danger hover:bg-danger-soft" onClick={() => setRemoving(m)}>
                      Remove
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <CardHeader title="What each role can do" />
        <dl className="divide-y divide-line">
          {(Object.keys(ROLE_INFO) as AdminRole[]).map((r) => (
            <div key={r} className="grid gap-1 px-5 py-3 sm:grid-cols-[140px_1fr]">
              <dt className="font-medium">{ROLE_INFO[r].label}</dt>
              <dd className="text-sm text-ink-muted">{ROLE_INFO[r].text}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-line px-5 py-3 text-xs text-ink-faint">
          These rules are enforced by the database, not just by hiding buttons. You can&apos;t change your own role, and the last owner can&apos;t be removed.
        </p>
      </Card>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a team member"
        footer={
          <>
            <Button onClick={() => setAdding(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={pending}
              disabled={!email.trim()}
              onClick={async () => {
                const r = await run(() => addTeamMember({ email, displayName: name, role }));
                if (r?.ok) {
                  setAdding(false);
                  setEmail("");
                  setName("");
                }
              }}
            >
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Email" htmlFor="tm-email">
            <Input id="tm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <Field label="Name" htmlFor="tm-name" optional>
            <Input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Role" htmlFor="tm-role" hint={ROLE_INFO[role].text}>
            <Select id="tm-role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
              {(Object.keys(ROLE_INFO) as AdminRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_INFO[r].label}
                </option>
              ))}
            </Select>
          </Field>
          <Notice tone="info">No password is set here. Tell them to open the admin and press “Forgot password” to choose their own.</Notice>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.email}?`}
        confirmLabel="Remove access"
        busy={pending}
        onConfirm={async () => {
          if (!removing) return;
          const r = await run(() => removeTeamMember(removing.user_id));
          if (r) setRemoving(null);
        }}
      >
        <p>They will no longer be able to open the admin. Everything they changed stays in the activity log.</p>
      </ConfirmDialog>
    </div>
  );
}
