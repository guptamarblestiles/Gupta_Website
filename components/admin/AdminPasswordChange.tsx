"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordResult } from "@/lib/admin/passwordActions";

function Field({ label, name }: { label: string; name: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm text-neutral-400">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="password"
        required
        autoComplete="off"
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-500"
      />
    </div>
  );
}

export function AdminPasswordChange() {
  const [state, formAction, isPending] = useActionState<ChangePasswordResult, FormData>(
    changePasswordAction,
    undefined,
  );

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <Field label="Current password" name="currentPassword" />
      <Field label="New password" name="newPassword" />
      <Field label="Confirm new password" name="confirmPassword" />

      {state?.status === "error" && (
        <p className="text-sm text-red-400" role="alert">
          {state.message}
        </p>
      )}
      {state?.status === "success" && (
        <p className="text-sm text-green-400" role="status">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded bg-white px-6 py-2 text-sm font-medium text-neutral-950 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Change password"}
      </button>
    </form>
  );
}
