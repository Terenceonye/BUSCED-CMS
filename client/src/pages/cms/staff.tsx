import * as React from "react";
import {
  ImagePlus,
  Mail,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/misc";
import { MultiSelect, type Option } from "@/components/ui/multi-select";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm";
import { api, del, get } from "@/lib/api";
import { initials } from "@/lib/utils";

interface Ref {
  _id: string;
  name?: string;
}

interface StaffMember {
  _id: string;
  fullName?: string;
  title?: string;
  position?: string;
  email?: string;
  phone?: string;
  affiliation?: string;
  specialization?: string[];
  faculty?: Ref | string;
  department?: (Ref | string)[];
  program?: (Ref | string)[];
  profileImage?: { url?: string } | null;
  about?: { bio?: string; degrees?: string[] };
}

const MAX_IMAGE_BYTES = 250 * 1024;

const asId = (v: Ref | string | undefined) =>
  !v ? "" : typeof v === "object" ? v._id : v;
const asIds = (v?: (Ref | string)[]) => (v ?? []).map(asId).filter(Boolean);
const asName = (v: Ref | string | undefined) =>
  v && typeof v === "object" ? (v.name ?? "") : "";

export default function StaffPage() {
  const [rows, setRows] = React.useState<StaffMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const [faculties, setFaculties] = React.useState<Option[]>([]);
  const [departments, setDepartments] = React.useState<Option[]>([]);
  const [programs, setPrograms] = React.useState<Option[]>([]);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<StaffMember | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [fullName, setFullName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [affiliation, setAffiliation] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [faculty, setFaculty] = React.useState("");
  const [department, setDepartment] = React.useState<string[]>([]);
  const [program, setProgram] = React.useState<string[]>([]);
  const [image, setImage] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const confirm = useConfirm<StaffMember>();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // This endpoint returns { success, staff }, not the { data } envelope.
      const payload = await get("/api/staff");
      setRows((payload?.staff ?? []) as StaffMember[]);
    } catch (err: any) {
      setError(err?.message || "Could not load staff.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const toOptions = (list: any[]): Option[] =>
      list.map((o) => ({ value: o._id, label: o.name ?? o._id }));

    Promise.all([
      get("/api/schools").catch(() => ({})),
      get("/api/departments").catch(() => ({})),
      get("/api/programs").catch(() => ({})),
    ]).then(([f, d, p]) => {
      setFaculties(toOptions(f?.data ?? []));
      setDepartments(toOptions(d?.data ?? []));
      // /api/programs returns { programs }, the others return { data }.
      setPrograms(toOptions(p?.programs ?? []));
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
    return rows.filter(
      (r) =>
        r.fullName?.toLowerCase().includes(q) ||
        r.email?.toLowerCase().includes(q) ||
        r.position?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setFullName("");
    setTitle("");
    setPosition("");
    setEmail("");
    setPhone("");
    setAffiliation("");
    setBio("");
    setFaculty("");
    setDepartment([]);
    setProgram([]);
    setImage(null);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (row: StaffMember) => {
    setEditing(row);
    setFullName(row.fullName ?? "");
    setTitle(row.title ?? "");
    setPosition(row.position ?? "");
    setEmail(row.email ?? "");
    setPhone(row.phone ?? "");
    setAffiliation(row.affiliation ?? "");
    setBio(row.about?.bio ?? "");
    setFaculty(asId(row.faculty));
    setDepartment(asIds(row.department));
    setProgram(asIds(row.program));
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
    if (!fullName.trim()) next.fullName = "Full name is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      next.email = "Enter a valid email";
    if (!phone.trim()) next.phone = "Phone is required";
    if (!faculty) next.faculty = "Faculty is required";
    if (department.length === 0) next.department = "Select at least one department";
    if (program.length === 0) next.program = "Select at least one program";

    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    // The endpoint reads the record from a JSON string in `staff`, with the
    // photo sent alongside as `profileImage`.
    const payload: Record<string, unknown> = {
      fullName: fullName.trim(),
      title: title.trim(),
      position: position.trim(),
      email: email.trim(),
      phone: phone.trim(),
      affiliation: affiliation.trim(),
      faculty,
      department,
      program,
      about: { ...(editing?.about ?? {}), bio: bio.trim() },
    };

    const form = new FormData();
    form.append("staff", JSON.stringify(payload));
    if (image) form.append("profileImage", image);

    setSaving(true);
    try {
      if (editing) {
        await api(`/api/staff/${editing._id}`, { method: "PUT", body: form });
        toast.success("Staff member updated");
      } else {
        await api("/api/staff", { method: "POST", body: form });
        toast.success("Staff member created");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not save the staff member.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm.target) return;
    confirm.setLoading(true);
    try {
      await del(`/api/staff/${confirm.target._id}`);
      toast.success("Staff member deleted");
      confirm.close();
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete the staff member.");
      confirm.setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Staff"
        description="Academic and administrative staff profiles."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            New staff
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
              placeholder="Search by name, email or position..."
              className="pl-9 sm:max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        {loading ? (
          <TableSkeleton rows={5} cols={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? "No matches" : "No staff yet"}
            description={
              search
                ? "Try a different search term."
                : "Add your first staff member to get started."
            }
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <Plus />
                  New staff
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact</TableHead>
                <TableHead className="hidden lg:table-cell">Faculty</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {row.profileImage?.url && (
                          <AvatarImage src={row.profileImage.url} alt="" />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {initials(row.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {[row.title, row.fullName].filter(Boolean).join(" ")}
                        </p>
                        {row.position && (
                          <p className="truncate text-xs text-muted-foreground">
                            {row.position}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5 text-xs text-muted-foreground">
                      {row.email && (
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3" />
                          {row.email}
                        </p>
                      )}
                      {row.phone && (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          {row.phone}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {asName(row.faculty) || "-"}
                    </span>
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
            <DialogTitle>{editing ? "Edit staff member" : "New staff member"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update this staff profile."
                : "Add a staff profile to the directory."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {preview ? (
                  <AvatarImage src={preview} alt="" />
                ) : editing?.profileImage?.url ? (
                  <AvatarImage src={editing.profileImage.url} alt="" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials(fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus />
                  {image ? "Change photo" : "Upload photo"}
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  JPG or PNG · max 250KB
                </p>
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
              {image && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setImage(null)}
                  aria-label="Clear photo"
                >
                  <X />
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="s-title">Title</Label>
                <Input
                  id="s-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Dr."
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="s-name">
                  Full name<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="s-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.fullName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-position">Position</Label>
                <Input
                  id="s-position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Senior Lecturer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-affiliation">Affiliation</Label>
                <Input
                  id="s-affiliation"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-email">
                  Email<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="s-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs font-medium text-destructive">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-phone">
                  Phone<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="s-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+234..."
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && (
                  <p className="text-xs font-medium text-destructive">{errors.phone}</p>
                )}
              </div>
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
                  Programs<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <MultiSelect
                  options={programs}
                  value={program}
                  onChange={setProgram}
                  placeholder="Select programs"
                  invalid={!!errors.program}
                  emptyText="Create a program first"
                />
                {errors.program && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.program}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-bio">Biography</Label>
              <Textarea
                id="s-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short profile biography"
              />
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
                {editing ? "Save changes" : "Create staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        title="Delete this staff member?"
        description={`${confirm.target?.fullName ?? "This profile"} will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={confirm.loading}
        onConfirm={remove}
      />
    </>
  );
}
