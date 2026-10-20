"use client";

import { useActionState, useState } from "react";
import { Button } from "@admin/components/ui/Button";
import { Card, CardHeader, Notice } from "@admin/components/ui/Display";
import { Field, Input } from "@admin/components/ui/Field";
import { useAction } from "@admin/lib/client/useAction";
import { changePassword, type FormState } from "@admin/actions/auth";
import { updateMyName } from "@admin/actions/team";

export function AccountForms({ displayName }: { displayName: string }) {
  const { run, pending } = useAction();
  const [name, setName] = useState(displayName);
  const [state, action, saving] = useActionState<FormState, FormData>(changePassword, undefined);

  return (
    <>
      <Card>
        <CardHeader title="Your name" description="Shown in the sidebar and to the owner on the team page." />
        <form
          className="flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => updateMyName(name));
          }}
        >
          <Field label="Display name" htmlFor="acc-name" className="flex-1">
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" loading={pending} disabled={name === displayName}>
            Save
          </Button>
        </form>
      </Card>
      <Card>
        <CardHeader title="Change password" />
        <form action={action} className="space-y-4 p-5" noValidate>
          {state?.message && <Notice tone={state.ok ? "success" : "danger"}>{state.message}</Notice>}
          <Field label="Current password" htmlFor="acc-current" error={state?.fieldErrors?.current}>
            <Input id="acc-current" name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="New password" htmlFor="acc-new" hint="At least 10 characters." error={state?.fieldErrors?.password}>
            <Input id="acc-new" name="password" type="password" autoComplete="new-password" required />
          </Field>
          <Field label="Type it again" htmlFor="acc-confirm" error={state?.fieldErrors?.confirm}>
            <Input id="acc-confirm" name="confirm" type="password" autoComplete="new-password" required />
          </Field>
          <Button type="submit" variant="primary" loading={saving}>
            Change password
          </Button>
        </form>
      </Card>
    </>
  );
}
