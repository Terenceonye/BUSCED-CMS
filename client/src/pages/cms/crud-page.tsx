import * as React from "react";
import { MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm";
import { del, get, post, put } from "@/lib/api";

export type FieldType = "text" | "textarea" | "select" | "tags" | "number";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  /** For "select": where to load options from and how to label them. */
  optionsUrl?: string;
  optionLabel?: (o: any) => string;
}

export interface ColumnConfig<T> {
  header: string;
  /** Rendered cell content. */
  cell: (row: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  title: string;
  description: string;
  /** Base endpoint, e.g. /api/v1/schools */
  endpoint: string;
  /** Human singular name used in dialogs, e.g. "faculty". */
  singular: string;
  fields: FieldConfig[];
  columns: ColumnConfig<T>[];
  /** Field used by the search box. */
  searchKey?: string;
  /** Optional custom label for a row in confirm dialogs. */
  rowLabel?: (row: T) => string;
}

type AnyRecord = Record<string, any>;

/** Reads the array of records out of the API envelope. */
function extractList(payload: any): AnyRecord[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export function CrudPage<T extends AnyRecord>({
  title,
  description,
  endpoint,
  singular,
  fields,
  columns,
  searchKey = "name",
  rowLabel,
}: Props<T>) {
  const [rows, setRows] = React.useState<AnyRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AnyRecord | null>(null);
  const [form, setForm] = React.useState<AnyRecord>({});
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  // Options for any select fields, keyed by field name.
  const [options, setOptions] = React.useState<Record<string, AnyRecord[]>>({});

  const confirm = useConfirm<AnyRecord>();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await get(endpoint);
      setRows(extractList(payload));
    } catch (err: any) {
      setError(err?.message || `Could not load ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [endpoint, title]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Load select options once.
  React.useEffect(() => {
    const selects = fields.filter((f) => f.type === "select" && f.optionsUrl);
    if (!selects.length) return;

    let cancelled = false;
    Promise.all(
      selects.map(async (f) => {
        try {
          const payload = await get(f.optionsUrl!);
          return [f.name, extractList(payload)] as const;
        } catch {
          return [f.name, []] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setOptions(Object.fromEntries(entries));
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      String(r[searchKey] ?? "")
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search, searchKey]);

  const blankForm = React.useMemo(() => {
    const base: AnyRecord = {};
    fields.forEach((f) => {
      base[f.name] = f.type === "tags" ? [] : "";
    });
    return base;
  }, [fields]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (row: AnyRecord) => {
    const next: AnyRecord = {};
    fields.forEach((f) => {
      const value = row[f.name];
      if (f.type === "tags") {
        next[f.name] = Array.isArray(value) ? value : [];
      } else if (f.type === "select") {
        // Populated refs arrive as objects; the form needs the id.
        next[f.name] =
          value && typeof value === "object" ? (value._id ?? "") : (value ?? "");
      } else {
        next[f.name] = value ?? "";
      }
    });
    setEditing(row);
    setForm(next);
    setErrors({});
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    fields.forEach((f) => {
      if (!f.required) return;
      const v = form[f.name];
      const empty =
        f.type === "tags" ? !Array.isArray(v) || v.length === 0 : !String(v ?? "").trim();
      if (empty) next[f.name] = `${f.label} is required`;
    });
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload: AnyRecord = {};
    fields.forEach((f) => {
      const v = form[f.name];
      if (f.type === "tags") payload[f.name] = v;
      else if (f.type === "number") payload[f.name] = Number(v);
      else payload[f.name] = typeof v === "string" ? v.trim() : v;
    });

    setSaving(true);
    try {
      if (editing) {
        await put(`${endpoint}/${editing._id}`, payload);
        toast.success(`${singular} updated`);
      } else {
        await post(endpoint, payload);
        toast.success(`${singular} created`);
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || `Could not save the ${singular.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm.target) return;
    confirm.setLoading(true);
    try {
      await del(`${endpoint}/${confirm.target._id}`);
      toast.success(`${singular} deleted`);
      confirm.close();
      await load();
    } catch (err: any) {
      toast.error(err?.message || `Could not delete the ${singular.toLowerCase()}.`);
      confirm.setLoading(false);
    }
  };

  const setField = (name: string, value: any) =>
    setForm((f) => ({ ...f, [name]: value }));

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Button onClick={openCreate}>
            <Plus />
            New {singular.toLowerCase()}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}...`}
              className="pl-9 sm:max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        {loading ? (
          <TableSkeleton rows={5} cols={columns.length + 1} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No matches" : `No ${title.toLowerCase()} yet`}
            description={
              search
                ? "Try a different search term."
                : `Create your first ${singular.toLowerCase()} to get started.`
            }
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <Plus />
                  New {singular.toLowerCase()}
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c.header} className={c.className}>
                    {c.header}
                  </TableHead>
                ))}
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row._id}>
                  {columns.map((c) => (
                    <TableCell key={c.header} className={c.className}>
                      {c.cell(row as T)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(row)}>
                          <Pencil />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => confirm.ask(row)}
                        >
                          <Trash2 />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create / edit */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Update this ${singular.toLowerCase()}.`
                : `Add a new ${singular.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            {fields.map((f) => (
              <div key={f.name} className="space-y-2">
                <Label htmlFor={f.name}>
                  {f.label}
                  {f.required && <span className="ml-0.5 text-destructive">*</span>}
                </Label>

                {f.type === "textarea" ? (
                  <Textarea
                    id={f.name}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    placeholder={f.placeholder}
                    aria-invalid={!!errors[f.name]}
                  />
                ) : f.type === "select" ? (
                  <Select
                    value={form[f.name] || undefined}
                    onValueChange={(v) => setField(f.name, v)}
                  >
                    <SelectTrigger aria-invalid={!!errors[f.name]}>
                      <SelectValue placeholder={f.placeholder ?? "Select..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {(options[f.name] ?? []).map((o) => (
                        <SelectItem key={o._id} value={o._id}>
                          {f.optionLabel ? f.optionLabel(o) : (o.name ?? o._id)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === "tags" ? (
                  <TagsInput
                    value={form[f.name] ?? []}
                    onChange={(v) => setField(f.name, v)}
                    placeholder={f.placeholder}
                    invalid={!!errors[f.name]}
                  />
                ) : (
                  <Input
                    id={f.name}
                    type={f.type === "number" ? "number" : "text"}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setField(f.name, e.target.value)}
                    placeholder={f.placeholder}
                    aria-invalid={!!errors[f.name]}
                  />
                )}

                {errors[f.name] && (
                  <p className="text-xs font-medium text-destructive">
                    {errors[f.name]}
                  </p>
                )}
                {f.help && !errors[f.name] && (
                  <p className="text-xs text-muted-foreground">{f.help}</p>
                )}
              </div>
            ))}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        title={`Delete this ${singular.toLowerCase()}?`}
        description={`${
          confirm.target
            ? rowLabel
              ? rowLabel(confirm.target as T)
              : (confirm.target[searchKey] ?? "This record")
            : ""
        } will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={confirm.loading}
        onConfirm={remove}
      />
    </>
  );
}

/** Comma/Enter separated list editor for array-of-string fields. */
function TagsInput({
  value,
  onChange,
  placeholder,
  invalid,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const [draft, setDraft] = React.useState("");

  const commit = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    setDraft("");
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 pb-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="rounded-full p-0.5 hover:bg-background/60"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={placeholder ?? "Type and press Enter"}
        aria-invalid={invalid}
      />
    </div>
  );
}
