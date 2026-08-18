"use server";

import { changeAdminPassword } from "@/lib/admin/passwordAuth";
import { validatePasswordStrength } from "@/lib/admin/passwordUtils";

export type ChangePasswordResult =
  | { status: "error"; message: string }
  | { status: "success"; message: string }
  | void;

export async function changePasswordAction(
  _prev: ChangePasswordResult,
  formData: FormData,
): Promise<ChangePasswordResult> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) {
    return { status: "error", message: "Enter your current password." };
  }
  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    return { status: "error", message: strengthError };
  }
  if (newPassword !== confirmPassword) {
    return { status: "error", message: "New password and confirmation do not match." };
  }
  if (newPassword === currentPassword) {
    return { status: "error", message: "New password must be different from the current password." };
  }

  try {
    await changeAdminPassword(currentPassword, newPassword);
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Failed to change password." };
  }

  return { status: "success", message: "Password changed successfully." };
}
