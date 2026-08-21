import * as React from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

// The previous CMS built these sections by hand with "+" / "-" buttons that
// cloned a row of inputs. Both components below replace that, so the staff form
// can offer the same repeatable fields without repeating the wiring seven times.

// A list of free-text values: certifications, degrees, research interests.
export function StringList({
  label,
  values,
  onChange,
  placeholder,
  addLabel = "Add",
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...values, ""])}
        >
          <Plus />
          {addLabel}
        </Button>
      </div>
      {values.length === 0 ? (
        <p className="text-xs text-muted-foreground">None added yet.</p>
      ) : (
        <div className="space-y-2">
          {values.map((value, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={value}
                placeholder={placeholder}
                onChange={(e) =>
                  onChange(
                    values.map((v, idx) => (idx === i ? e.target.value : v)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${label} entry`}
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// A list of structured rows: research outputs, grants, activities. The caller
// renders the inputs for a single entry and gets back a patch function, so each
// section only has to describe its own fields.
export function EntryList<T>({
  label,
  values,
  onChange,
  blank,
  rowClassName = "sm:grid-cols-2",
  addLabel = "Add",
  children,
}: {
  label: string;
  values: T[];
  onChange: (next: T[]) => void;
  blank: () => T;
  rowClassName?: string;
  addLabel?: string;
  children: (entry: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...values, blank()])}
        >
          <Plus />
          {addLabel}
        </Button>
      </div>
      {values.length === 0 ? (
        <p className="text-xs text-muted-foreground">None added yet.</p>
      ) : (
        <div className="space-y-2">
          {values.map((entry, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-md border border-input p-2"
            >
              <div className={cn("grid flex-1 gap-2", rowClassName)}>
                {children(entry, (patch) =>
                  onChange(
                    values.map((v, idx) =>
                      idx === i ? { ...v, ...patch } : v,
                    ),
                  ),
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${label} entry`}
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
