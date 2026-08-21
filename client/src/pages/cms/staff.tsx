import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
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
import { EntryList, StringList } from "@/components/ui/repeatable";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm";
import { api, del, get } from "@/lib/api";
import { initials } from "@/lib/utils";

interface Ref {
  _id: string;
  name?: string;
}

interface ResearchOutput {
  title?: string;
  date?: string;
  collaborators?: string[];
  pdfUrl?: string;
  viewLink?: string;
}

interface Grant {
  title?: string;
  date?: string;
  tag?: string;
  description?: string;
}

interface ProfessionalActivity {
  type?: string;
  title?: string;
  date?: string;
  description?: string;
}

interface TeachingActivity {
  tag?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  link?: string;
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
  externalLinks?: {
    googleScholar?: string;
    researchGate?: string;
    collaborationNetwork?: string;
  };
  researchOutputs?: ResearchOutput[];
  research?: { interests?: string[]; grants?: Grant[] };
  professionalActivities?: ProfessionalActivity[];
  teachingActivities?: TeachingActivity[];
}

// The repeatable sections edit plain strings and convert on save, so a date
// input can hold a partial value and "a, b," can be typed a character at a
// time. `collaborators` is comma-separated text here and an array on the wire,
// exactly as the previous CMS handled it.
interface OutputRow {
  title: string;
  date: string;
  collaborators: string;
  pdfUrl: string;
  viewLink: string;
}
interface GrantRow {
  title: string;
  date: string;
  tag: string;
  description: string;
}
interface ActivityRow {
  type: string;
  title: string;
  date: string;
  description: string;
}
interface TeachingRow {
  tag: string;
  title: string;
  startDate: string;
  endDate: string;
  link: string;
}

const MAX_IMAGE_BYTES = 250 * 1024;
const PAGE_SIZE = 20;

// A profile photo must show exactly one face, as it did in the previous CMS.
// face-api.js carries TensorFlow with it, so it is imported only when someone
// actually picks a photo instead of on every dashboard load. The weights are
// served from /models by this app rather than a third-party CDN.
let faceApi: Promise<typeof import("face-api.js")> | null = null;
const loadFaceApi = () => {
  if (!faceApi) {
    faceApi = import("face-api.js").then(async (mod) => {
      await mod.nets.tinyFaceDetector.loadFromUri("/models");
      return mod;
    });
    // A failed load must not be cached, or one offline moment would disable
    // the check for the rest of the session.
    faceApi.catch(() => {
      faceApi = null;
    });
  }
  return faceApi;
};

const countFaces = async (file: File) => {
  const mod = await loadFaceApi();
  const img = await mod.bufferToImage(file);
  const found = await mod.detectAllFaces(
    img,
    new mod.TinyFaceDetectorOptions(),
  );
  return found.length;
};

type FaceStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "ok" }
  | { state: "rejected"; message: string }
  | { state: "unavailable" };

// Mongo returns dates as ISO strings; <input type="date"> wants YYYY-MM-DD.
const toDateInput = (v?: string) => (v ? String(v).slice(0, 10) : "");
const splitList = (v: string) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const cleanList = (v: string[]) => v.map((s) => s.trim()).filter(Boolean);

const asId = (v: Ref | string | undefined) =>
  !v ? "" : typeof v === "object" ? v._id : v;
const asIds = (v?: (Ref | string)[]) => (v ?? []).map(asId).filter(Boolean);
const asName = (v: Ref | string | undefined) =>
  v && typeof v === "object" ? (v.name ?? "") : "";

// Groups a set of related fields, standing in for the <fieldset>/<legend>
// blocks the previous CMS used to break this long form up.
function Fieldset({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export default function StaffPage() {
  const [rows, setRows] = React.useState<StaffMember[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);

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
  const [face, setFace] = React.useState<FaceStatus>({ state: "idle" });

  const [specialization, setSpecialization] = React.useState<string[]>([]);
  const [degrees, setDegrees] = React.useState<string[]>([]);
  const [interests, setInterests] = React.useState<string[]>([]);
  const [googleScholar, setGoogleScholar] = React.useState("");
  const [researchGate, setResearchGate] = React.useState("");
  const [collaborationNetwork, setCollaborationNetwork] = React.useState("");
  const [outputs, setOutputs] = React.useState<OutputRow[]>([]);
  const [grants, setGrants] = React.useState<GrantRow[]>([]);
  const [activities, setActivities] = React.useState<ActivityRow[]>([]);
  const [teaching, setTeaching] = React.useState<TeachingRow[]>([]);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const confirm = useConfirm<StaffMember>();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (query) params.set("q", query);
      // This endpoint returns { success, staff }, not the { data } envelope.
      const payload = await get(`/api/v1/staff?${params.toString()}`);
      setRows((payload?.staff ?? []) as StaffMember[]);
      setTotal(payload?.total ?? 0);
      setPages(payload?.pages ?? 1);
    } catch (err: any) {
      setError(err?.message || "Could not load staff.");
    } finally {
      setLoading(false);
    }
  }, [page, query]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Debounced so typing does not fire a request per keystroke, and any new
  // term starts from the first page.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Deleting the last row of the last page would otherwise strand the user on
  // a page that no longer exists.
  React.useEffect(() => {
    if (!loading && page > pages) setPage(pages);
  }, [loading, page, pages]);

  React.useEffect(() => {
    const toOptions = (list: any[]): Option[] =>
      list.map((o) => ({ value: o._id, label: o.name ?? o._id }));

    Promise.all([
      get("/api/v1/schools").catch(() => ({})),
      get("/api/v1/departments").catch(() => ({})),
      get("/api/v1/programs").catch(() => ({})),
    ]).then(([f, d, p]) => {
      setFaculties(toOptions(f?.data ?? []));
      setDepartments(toOptions(d?.data ?? []));
      // /api/v1/programs returns { programs }, the others return { data }.
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

  // Filtering and paging both happen on the server now, so whatever comes back
  // is exactly what this page shows.
  const firstOnPage = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastOnPage = Math.min(page * PAGE_SIZE, total);

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
    setFace({ state: "idle" });
    setSpecialization([]);
    setDegrees([]);
    setInterests([]);
    setGoogleScholar("");
    setResearchGate("");
    setCollaborationNetwork("");
    setOutputs([]);
    setGrants([]);
    setActivities([]);
    setTeaching([]);
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
    setFace({ state: "idle" });
    setSpecialization(row.specialization ?? []);
    setDegrees(row.about?.degrees ?? []);
    setInterests(row.research?.interests ?? []);
    setGoogleScholar(row.externalLinks?.googleScholar ?? "");
    setResearchGate(row.externalLinks?.researchGate ?? "");
    setCollaborationNetwork(row.externalLinks?.collaborationNetwork ?? "");
    setOutputs(
      (row.researchOutputs ?? []).map((o) => ({
        title: o.title ?? "",
        date: toDateInput(o.date),
        collaborators: (o.collaborators ?? []).join(", "),
        pdfUrl: o.pdfUrl ?? "",
        // Not editable here, but carried through so saving cannot drop it.
        viewLink: o.viewLink ?? "",
      })),
    );
    setGrants(
      (row.research?.grants ?? []).map((g) => ({
        title: g.title ?? "",
        date: toDateInput(g.date),
        tag: g.tag ?? "",
        description: g.description ?? "",
      })),
    );
    setActivities(
      (row.professionalActivities ?? []).map((a) => ({
        type: a.type ?? "",
        title: a.title ?? "",
        date: toDateInput(a.date),
        description: a.description ?? "",
      })),
    );
    setTeaching(
      (row.teachingActivities ?? []).map((t) => ({
        tag: t.tag ?? "",
        title: t.title ?? "",
        startDate: toDateInput(t.startDate),
        endDate: toDateInput(t.endDate),
        link: t.link ?? "",
      })),
    );
    setErrors({});
    setOpen(true);
  };

  const pickImage = async (file?: File | null) => {
    if (!file) return;
    if (!["image/jpg", "image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Only JPG and PNG images are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be smaller than 250KB.");
      return;
    }

    setFace({ state: "checking" });
    let found: number;
    try {
      found = await countFaces(file);
    } catch {
      // The detector could not run. Blocking every upload because a model file
      // failed to load would be worse than accepting an unchecked photo, so
      // keep the image and say the check was skipped.
      setImage(file);
      setFace({ state: "unavailable" });
      return;
    }

    if (found !== 1) {
      const message =
        found === 0
          ? "No face detected. Try another image."
          : "Multiple faces detected. Try another image.";
      setImage(null);
      setFace({ state: "rejected", message });
      toast.error(message);
      return;
    }

    setImage(file);
    setFace({ state: "ok" });
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
      specialization: cleanList(specialization),
      externalLinks: {
        googleScholar: googleScholar.trim(),
        researchGate: researchGate.trim(),
        collaborationNetwork: collaborationNetwork.trim(),
      },
      about: { bio: bio.trim(), degrees: cleanList(degrees) },
      // Rows left completely blank are dropped rather than saved as empty
      // subdocuments, matching how the previous CMS filtered them.
      researchOutputs: outputs
        .map((o) => ({
          title: o.title.trim(),
          date: o.date,
          collaborators: splitList(o.collaborators),
          pdfUrl: o.pdfUrl.trim(),
          viewLink: o.viewLink.trim(),
        }))
        .filter(
          (o) =>
            o.title || o.date || o.collaborators.length || o.pdfUrl || o.viewLink,
        ),
      research: {
        interests: cleanList(interests),
        grants: grants
          .map((g) => ({
            title: g.title.trim(),
            date: g.date,
            tag: g.tag.trim(),
            description: g.description.trim(),
          }))
          .filter((g) => g.title || g.date || g.tag || g.description),
      },
      professionalActivities: activities
        .map((a) => ({
          type: a.type.trim(),
          title: a.title.trim(),
          date: a.date,
          description: a.description.trim(),
        }))
        .filter((a) => a.type || a.title || a.date || a.description),
      teachingActivities: teaching
        .map((t) => ({
          tag: t.tag.trim(),
          title: t.title.trim(),
          startDate: t.startDate,
          endDate: t.endDate,
          link: t.link.trim(),
        }))
        .filter((t) => t.tag || t.title || t.startDate || t.endDate || t.link),
    };

    const form = new FormData();
    form.append("staff", JSON.stringify(payload));
    if (image) form.append("profileImage", image);

    setSaving(true);
    try {
      if (editing) {
        await api(`/api/v1/staff/${editing._id}`, { method: "PUT", body: form });
        toast.success("Staff member updated");
      } else {
        await api("/api/v1/staff", { method: "POST", body: form });
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
      await del(`/api/v1/staff/${confirm.target._id}`);
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
        ) : rows.length === 0 ? (
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
              {rows.map((row) => (
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

        {!loading && !error && total > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border p-4 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Showing {firstOnPage}-{lastOnPage} of {total}
              {query ? " matching" : ""} staff
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {pages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
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
                  disabled={face.state === "checking"}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus />
                  {image ? "Change photo" : "Upload photo"}
                </Button>
                {face.state === "checking" ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Detecting faces...
                  </p>
                ) : face.state === "ok" ? (
                  <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-500">
                    Face detected
                  </p>
                ) : face.state === "rejected" ? (
                  <p className="mt-1.5 text-xs font-medium text-destructive">
                    {face.message}
                  </p>
                ) : face.state === "unavailable" ? (
                  <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-500">
                    Face check unavailable - photo accepted unchecked.
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    JPG or PNG · max 250KB · one face
                  </p>
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
              {image && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setImage(null);
                    setFace({ state: "idle" });
                  }}
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

            <Fieldset title="Recognized skills and credentials">
              <StringList
                label="Certifications"
                values={specialization}
                onChange={setSpecialization}
                placeholder="e.g. Machine Learning"
              />
              <StringList
                label="Degrees"
                values={degrees}
                onChange={setDegrees}
                placeholder="e.g. BSc - (Physics)"
              />
              <StringList
                label="Research interests"
                values={interests}
                onChange={setInterests}
                placeholder="e.g. Quantum Computing"
              />
            </Fieldset>

            <Fieldset title="Collaboration networks">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="s-scholar">Google Scholar</Label>
                  <Input
                    id="s-scholar"
                    type="url"
                    value={googleScholar}
                    onChange={(e) => setGoogleScholar(e.target.value)}
                    placeholder="https://scholar.google.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-rgate">ResearchGate</Label>
                  <Input
                    id="s-rgate"
                    type="url"
                    value={researchGate}
                    onChange={(e) => setResearchGate(e.target.value)}
                    placeholder="https://researchgate.net/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-network">Collaboration network</Label>
                  <Input
                    id="s-network"
                    type="url"
                    value={collaborationNetwork}
                    onChange={(e) => setCollaborationNetwork(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>
            </Fieldset>

            <Fieldset title="Research outputs">
              <EntryList
                label="Publications"
                values={outputs}
                onChange={setOutputs}
                addLabel="Add output"
                rowClassName="sm:grid-cols-2"
                blank={() => ({
                  title: "",
                  date: "",
                  collaborators: "",
                  pdfUrl: "",
                  viewLink: "",
                })}
              >
                {(entry, update) => (
                  <>
                    <Input
                      value={entry.title}
                      placeholder="Title"
                      onChange={(e) => update({ title: e.target.value })}
                    />
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(e) => update({ date: e.target.value })}
                    />
                    <Input
                      value={entry.collaborators}
                      placeholder="Collaborators (comma-separated)"
                      onChange={(e) => update({ collaborators: e.target.value })}
                    />
                    <Input
                      type="url"
                      value={entry.pdfUrl}
                      placeholder="PDF URL"
                      onChange={(e) => update({ pdfUrl: e.target.value })}
                    />
                  </>
                )}
              </EntryList>
            </Fieldset>

            <Fieldset title="Research grants">
              <EntryList
                label="Grants"
                values={grants}
                onChange={setGrants}
                addLabel="Add grant"
                rowClassName="sm:grid-cols-2"
                blank={() => ({ title: "", date: "", tag: "", description: "" })}
              >
                {(entry, update) => (
                  <>
                    <Input
                      value={entry.title}
                      placeholder="Title"
                      onChange={(e) => update({ title: e.target.value })}
                    />
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(e) => update({ date: e.target.value })}
                    />
                    <Input
                      value={entry.tag}
                      placeholder="Tag"
                      onChange={(e) => update({ tag: e.target.value })}
                    />
                    <Input
                      value={entry.description}
                      placeholder="Description"
                      onChange={(e) => update({ description: e.target.value })}
                    />
                  </>
                )}
              </EntryList>
            </Fieldset>

            <Fieldset title="Professional activities">
              <EntryList
                label="Activities"
                values={activities}
                onChange={setActivities}
                addLabel="Add activity"
                rowClassName="sm:grid-cols-2"
                blank={() => ({ type: "", title: "", date: "", description: "" })}
              >
                {(entry, update) => (
                  <>
                    <Input
                      value={entry.type}
                      placeholder="Type"
                      onChange={(e) => update({ type: e.target.value })}
                    />
                    <Input
                      value={entry.title}
                      placeholder="Title"
                      onChange={(e) => update({ title: e.target.value })}
                    />
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(e) => update({ date: e.target.value })}
                    />
                    <Input
                      value={entry.description}
                      placeholder="Description"
                      onChange={(e) => update({ description: e.target.value })}
                    />
                  </>
                )}
              </EntryList>
            </Fieldset>

            <Fieldset title="Teaching activities">
              <EntryList
                label="Courses"
                values={teaching}
                onChange={setTeaching}
                addLabel="Add course"
                rowClassName="sm:grid-cols-2"
                blank={() => ({
                  tag: "",
                  title: "",
                  startDate: "",
                  endDate: "",
                  link: "",
                })}
              >
                {(entry, update) => (
                  <>
                    <Input
                      value={entry.tag}
                      placeholder="Tag"
                      onChange={(e) => update({ tag: e.target.value })}
                    />
                    <Input
                      value={entry.title}
                      placeholder="Title"
                      onChange={(e) => update({ title: e.target.value })}
                    />
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Start</span>
                      <Input
                        type="date"
                        value={entry.startDate}
                        onChange={(e) => update({ startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">End</span>
                      <Input
                        type="date"
                        value={entry.endDate}
                        onChange={(e) => update({ endDate: e.target.value })}
                      />
                    </div>
                    <Input
                      type="url"
                      value={entry.link}
                      placeholder="Link"
                      className="sm:col-span-2"
                      onChange={(e) => update({ link: e.target.value })}
                    />
                  </>
                )}
              </EntryList>
            </Fieldset>

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
