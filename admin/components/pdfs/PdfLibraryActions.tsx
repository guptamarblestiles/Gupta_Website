"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { PdfUploader } from "@/components/pdfs/PdfUploader";

export function PdfLibraryActions({ openUpload }: { openUpload?: boolean }) {
  const [open, setOpen] = useState(Boolean(openUpload));
  return (
    <>
      <Button variant="primary" icon={<Upload className="size-4" />} onClick={() => setOpen(true)}>
        Upload PDF
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Upload a catalogue PDF" size="lg">
        <PdfUploader />
      </Dialog>
    </>
  );
}
