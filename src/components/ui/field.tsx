import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Option } from "@/lib/constants";

const control =
  "w-full rounded-xl border border-line bg-bg px-3.5 text-base text-fg outline-none placeholder:text-muted focus:border-acc";

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 resize-none py-3", className)} {...props} />;
}

export function Select({ options, placeholder, className, ...props }: { options: Option[]; placeholder?: string } & ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11", className)} {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Dos campos en la misma fila. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

/** Radios (o casillas, con `multiple`) con aspecto de pastilla, sin JS. */
export function ChoicePills({
  label,
  name,
  options,
  defaultValue,
  multiple,
  defaultValues = [],
}: {
  label: string;
  name: string;
  options: Option[];
  defaultValue?: string;
  multiple?: boolean;
  defaultValues?: string[];
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-semibold text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o.value}>
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={o.value}
              defaultChecked={multiple ? defaultValues.includes(o.value) : o.value === defaultValue}
              className="peer sr-only"
            />
            <span className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-surface-2 px-3.5 text-sm font-semibold text-muted peer-checked:bg-fg peer-checked:text-bg peer-focus-visible:outline-2 peer-focus-visible:outline-acc">
              {o.tone && <span className={cn("dot", `tone-${o.tone}`)} aria-hidden />}
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
