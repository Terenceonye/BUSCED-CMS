import * as React from "react";
import { GraduationCap, ImagePlus, MoreHorizontal, Pencil, Plus, Search, Trash2, X } from "lucide-react";
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
import { MultiSelect, type Option } from "@/components/ui/multi-select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm";
import { api, del, get } from "@/lib/api";
import { cn, truncate } from "@/lib/utils";

interface Ref {
  _id: string;
  name?: string;
  programTypeName?: string;
}

interface Program {
  _id: string;
  name: string;
  description?: string;
  faculty?: Ref | string;
  department?: (Ref | string)[];
  programType?: (Ref | string)[];
  level?: string[];
  requiredCredit?: number;
  duration?: string;
  programImage?: { url?: string };
}

const LEVELS = ["ND", "HND"];
const MAX_IMAGE_BYTES = 250 * 1024;

const asId = (v: Ref | string | undefined) =>
  !v ? "" : typeof v === "object" ? v._id : v;

const asIds = (v?: (Ref | string)[]) => (v ?? []).map(asId).filter(Boolean);

const asName = (v: Ref | string | undefined) =>
  v && typeof v === "object" ? (v.name ?? v.programTypeName ?? "") : "";

export default function ProgramsPage() {
  const [rows, setRows] = React.useState<Program[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const [faculties, setFaculties] = React.useState<Option[]>([]);
  const [departments, setDepartments] = React.useState<Option[]>([]);
  const [programTypes, setProgramTypes] = React.useState<Option[]>([]);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Program | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [faculty, setFaculty] = React.useState("");
  const [department, setDepartment] = React.useState<string[]>([]);
  const [programType, setProgramType] = React.useState<string[]>([]);
  const [level, setLevel] = React.useState<string[]>([]);
  const [requiredCredit, setRequiredCredit] = React.useState("");
  const [duration, setDuration] = React.useState("");
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const confirm = useConfirm<Program>();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // This endpoint returns { success, programs } - not the { data } envelope
      // the other resources use.
      const payload = await get("/api/v1/programs");
      setRows((payload?.programs ?? []) as Program[]);
    } catch (err: any) {
      setError(err?.message || "Could not load programs.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Reference data for the form selects.
  React.useEffect(() => {
    const toOptions = (list: any[], labelKey: string): Option[] =>
      list.map((o) => ({ value: o._id, label: o[labelKey] ?? o._id }));

    Promise.all([
      get("/api/v1/schools").catch(() => ({})),
      get("/api/v1/departments").catch(() => ({})),
      get("/api/v1/program-types").catch(() => ({})),
    ]).then(([f, d, p]) => {
      setFaculties(toOptions(f?.data ?? [], "name"));
      setDepartments(toOptions(d?.data ?? [], "name"));
      setProgramTypes(toOptions(p?.data ?? [], "programTypeName"));
    });
  }, []);

  React.useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name?.toLowerCase().includes(q));
  }, [rows, search]);

  const reset = () => {
    setName("");
    setDescription("");
    setFaculty("");
    setDepartment([]);
    setProgramType([]);
    setLevel([]);
    setRequiredCredit("");
    setDuration("");
    setImage(null);
    setErrors({});
  };

  const openCreate = () => {
    setEditing(null);
    reset();
    setOpen(true);
  };

  const openEdit = (row: Program) => {
    setEditing(row);
    setName(row.name ?? "");
    setDescription(row.description ?? "");
    setFaculty(asId(row.faculty));
    setDepartment(asIds(row.department));
    setProgramType(asIds(row.programType));
    setLevel(row.level ?? []);
    setRequiredCredit(String(row.requiredCredit ?? ""));
    setDuration(row.duration ?? "");
    setImage(null);
    setErrors({});
    setOpen(true);
  };

  const pickImage = (file?: File | null) => {
    if (!file) return;
    if (!["image/jpg", "image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPG and PNG images are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be smaller than 250KB.");
      return;
    }
    setImage(file);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required";
    else if (name.trim().length < 3) next.name = "Name must be at least 3 characters";
    if (!description.trim()) next.description = "Description is required";
    else if (description.trim().length > 1000)
      next.description = "Description must be at most 1000 characters";
    if (!faculty) next.faculty = "Faculty is required";
    if (department.length === 0) next.department = "Select at least one department";
    if (programType.length === 0) next.programType = "Select at least one program type";
    if (level.length === 0) next.level = "Select at least one level";
    if (requiredCredit === "" || Number.isNaN(Number(requiredCredit)))
      next.requiredCredit = "Required credit must be a number";
    else if (Number(requiredCredit) < 0) next.requiredCredit = "Credit must be positive";
    if (!duration.trim()) next.duration = "Duration is required";
    // The server rejects a create with no file ("Program Image is required").
    if (!editing && !image) next.image = "Program image is required";

    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    // The endpoint expects multipart because it accepts a programImage file.
    const form = new FormData();
    form.append("name", name.trim());
    form.append("description", description.trim());
    form.append("faculty", faculty);
    department.forEach((d) => form.append("department", d));
    programType.forEach((p) => form.append("programType", p));
    level.forEach((l) => form.append("level", l));
    form.append("requiredCredit", String(Number(requiredCredit)));
    form.append("duration", duration.trim());
    if (image) form.append("programImage", image);

    setSaving(true);
    try {
      if (editing) {
        await api(`/api/v1/programs/${editing._id}`, { method: "PUT", body: form });
        toast.success("Program updated");
      } else {
        await api("/api/v1/programs", { method: "POST", body: form });
        toast.success("Program created");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not save the program.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm.target) return;
    confirm.setLoading(true);
    try {
      await del(`/api/v1/programs/${confirm.target._id}`);
      toast.success("Program deleted");
      confirm.close();
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete the program.");
      confirm.setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Programs"
        description="Academic programs offered across faculties."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            New program
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
              placeholder="Search programs..."
              className="pl-9 sm:max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={search ? "No matches" : "No programs yet"}
            description={
              search
                ? "Try a different search term."
                : "Create your first program to get started."
            }
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <Plus />
                  New program
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead className="hidden md:table-cell">Faculty</TableHead>
                <TableHead className="hidden lg:table-cell">Level</TableHead>
                <TableHead className="hidden lg:table-cell">Duration</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {row.programImage?.url ? (
                        <img
                          src={row.programImage.url}
                          alt=""
                          className="h-11 w-16 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{row.name}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {truncate(row.description ?? "", 70)}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {asName(row.faculty) || "-"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(row.level ?? []).map((l) => (
                        <Badge key={l} variant="secondary">
                          {l}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                    {row.duration || "-"}
                  </TableCell>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit program" : "New program"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this academic program."
                : "Add a new academic program."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">
                Name<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Computer Engineering"
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs font-medium text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-desc">
                Description<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Textarea
                id="p-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this program cover?"
                aria-invalid={!!errors.description}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/1000 characters
              </p>
              {errors.description && (
                <p className="text-xs font-medium text-destructive">
                  {errors.description}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>
                Faculty<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select value={faculty || undefined} onValueChange={setFaculty}>
                <SelectTrigger aria-invalid={!!errors.faculty}>
                  <SelectValue placeholder="Select a faculty" />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.faculty && (
                <p className="text-xs font-medium text-destructive">{errors.faculty}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Departments<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <MultiSelect
                  options={departments}
                  value={department}
                  onChange={setDepartment}
                  placeholder="Select departments"
                  invalid={!!errors.department}
                  emptyText="Create a department first"
                />
                {errors.department && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.department}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>
                  Program types<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <MultiSelect
                  options={programTypes}
                  value={programType}
                  onChange={setProgramType}
                  placeholder="Select program types"
                  invalid={!!errors.programType}
                  emptyText="Create a program type first"
                />
                {errors.programType && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.programType}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Level<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                {LEVELS.map((l) => {
                  const active = level.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() =>
                        setLevel((prev) =>
                          prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l],
                        )
                      }
                      className={cn(
                        "rounded-md border px-4 py-1.5 text-sm font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input hover:bg-accent",
                      )}
                    >
                      {l}
                    </button>
                  );
                })}
              </div>
              {errors.level && (
                <p className="text-xs font-medium text-destructive">{errors.level}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-credit">
                  Required credit<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="p-credit"
                  type="number"
                  min={0}
                  value={requiredCredit}
                  onChange={(e) => setRequiredCredit(e.target.value)}
                  placeholder="e.g. 120"
                  aria-invalid={!!errors.requiredCredit}
                />
                {errors.requiredCredit && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.requiredCredit}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="p-duration">
                  Duration<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="p-duration"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 2 years"
                  aria-invalid={!!errors.duration}
                />
                {errors.duration && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.duration}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Program image
                {!editing && <span className="ml-0.5 text-destructive">*</span>}
              </Label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors hover:border-primary/50 hover:bg-muted/50",
                  errors.image && "border-destructive",
                )}
              >
                {preview ? (
                  <img
                    src={preview}
                    alt=""
                    className="h-16 w-24 rounded object-cover"
                  />
                ) : editing?.programImage?.url ? (
                  <img
                    src={editing.programImage.url}
                    alt=""
                    className="h-16 w-24 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-24 items-center justify-center rounded bg-muted">
                    <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {image ? image.name : "Choose an image"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG or PNG · max 250KB {editing && "· leave empty to keep current"}
                  </p>
                </div>
                {image && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                    }}
                    className="rounded-full p-1 hover:bg-background"
                    aria-label="Clear image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    pickImage(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>
              {errors.image && (
                <p className="text-xs font-medium text-destructive">
                  {errors.image}
                </p>
              )}
            </div>

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
                {editing ? "Save changes" : "Create program"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        title="Delete this program?"
        description={`"${confirm.target?.name ?? ""}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={confirm.loading}
        onConfirm={remove}
      />
    </>
  );
}
