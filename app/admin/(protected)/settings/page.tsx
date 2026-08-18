import { AdminPasswordChange } from "@/components/admin/AdminPasswordChange";

export const metadata = { title: "Settings" };

export default function AdminSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-10">
      <div>
        <h1 className="text-xl font-medium text-white">Settings</h1>
        <p className="mt-1 text-sm text-neutral-400">Manage your admin account.</p>
      </div>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-neutral-400">
          Change password
        </h2>
        <AdminPasswordChange />
      </section>
    </div>
  );
}
