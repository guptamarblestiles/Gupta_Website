import { cn } from "@/lib/utils/cn";

/** Underline-only text input per the luxury/editorial input spec: no box,
 *  just a 1px bottom border that turns gold on focus. Placeholder renders
 *  in italic Playfair, not Inter — the one deliberate serif intrusion into
 *  form chrome, per spec. */
export function inputClasses(hasError: boolean) {
  return cn(
    "h-12 w-full border-0 border-b bg-transparent px-0 font-body text-body text-on-surface transition-colors duration-500 ease-luxury focus:outline-none",
    "placeholder:font-display placeholder:italic placeholder:text-on-surface-variant",
    hasError ? "border-error" : "border-on-surface focus:border-secondary",
  );
}

/** Multi-line fields can't be "underline only" and stay legible — a thin
 *  full border keeps the same architectural precision (1px, 0 radius,
 *  gold on focus) without pretending a textarea is a single underline. */
export function textareaClasses(hasError: boolean) {
  return cn(
    "w-full resize-none border bg-transparent px-4 py-3 font-body text-body text-on-surface transition-colors duration-500 ease-luxury focus:outline-none",
    "placeholder:font-display placeholder:italic placeholder:text-on-surface-variant",
    hasError ? "border-error" : "border-outline-variant focus:border-secondary",
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
};

/** Label + control + error message, shared across every form on the
 *  public site. Label is the overline treatment (uppercase, wide
 *  tracking) the luxury system uses for every small caps moment. */
export function Field({ label, htmlFor, error, children }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-3 block font-body text-label uppercase text-on-surface-variant"
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-2 font-body text-sm text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
