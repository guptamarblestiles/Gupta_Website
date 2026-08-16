/** One-off future product imports (the initial FINAL_FINAL batch used
 *  scripts/import/bulkImport.ts instead — see Part 2 of the build brief). */
import { ImportReviewGrid } from "@/components/admin/ImportReviewGrid";

export default function AdminImportPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-medium">Import</h1>
      <ImportReviewGrid />
    </div>
  );
}
