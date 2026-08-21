import * as React from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatDate } from "@/lib/utils";

interface EventItem {
  _id: string;
  title: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
}

const PER_PAGE = 10;

const EMPTY: Omit<EventItem, "_id"> = {
  title: "",
  description: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
};

/** Mongo returns ISO strings; <input type="date"> needs yyyy-MM-dd. */
function toDateInput(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function EventsPage() {
  const [page, setPage] = React.useState(1);
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EventItem | null>(null);
  const [form, setForm] = React.useState(EMPTY);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const confirm = useConfirm<EventItem>();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get(`/api/v1/admin/events?page=${page}&limit=${PER_PAGE}`);
      setEvents((res?.events ?? []) as EventItem[]);
      setTotal(res?.total ?? 0);
    } catch (err: any) {
      setError(err?.message || "Could not load events.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(Math.ceil(total / PER_PAGE), 1);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (item: EventItem) => {
    setEditing(item);
    setForm({
      title: item.title ?? "",
      description: item.description ?? "",
      date: toDateInput(item.date),
      startTime: item.startTime ?? "",
      endTime: item.endTime ?? "",
      location: item.location ?? "",
    });
    setErrors({});
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!form.title?.trim()) next.title = "Title is required";
    if (!form.date) next.date = "Date is required";
    if (form.startTime && form.endTime && form.endTime < form.startTime) {
      next.endTime = "End time must be after the start time";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const payload = {
        title: form.title!.trim(),
        description: form.description?.trim() ?? "",
        date: form.date,
        startTime: form.startTime ?? "",
        endTime: form.endTime ?? "",
        location: form.location?.trim() ?? "",
      };

      if (editing) {
        await put(`/api/v1/admin/events/${editing._id}`, payload);
        toast.success("Event updated");
      } else {
        await post("/api/v1/admin/events", payload);
        toast.success("Event created");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not save the event.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm.target) return;
    confirm.setLoading(true);
    try {
      await del(`/api/v1/admin/events/${confirm.target._id}`);
      toast.success("Event deleted");
      confirm.close();
      if (events.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete the event.");
      confirm.setLoading(false);
    }
  };

  const field = (key: keyof typeof EMPTY, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <PageHeader
        title="Events"
        description={`${total} event${total === 1 ? "" : "s"} in the calendar.`}
        actions={
          <Button onClick={openCreate}>
            <Plus />
            New event
          </Button>
        }
      />

      <Card>
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No events yet"
            description="Create your first event to show it on the website."
            action={
              <Button size="sm" onClick={openCreate}>
                <Plus />
                New event
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Time</TableHead>
                  <TableHead className="hidden lg:table-cell">Location</TableHead>
                  <TableHead className="w-[60px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <p className="text-sm font-medium">{item.title}</p>
                      {item.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-sm sm:table-cell">
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                      {item.startTime || item.endTime ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {[item.startTime, item.endTime].filter(Boolean).join(" - ")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                      {item.location ? (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {item.location}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(item)}>
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => confirm.ask(item)}
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit event" : "New event"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Update the details of this event."
                : "Add an event to the website calendar."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ev-title">Title</Label>
              <Input
                id="ev-title"
                value={form.title}
                onChange={(e) => field("title", e.target.value)}
                placeholder="Event title"
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p className="text-xs font-medium text-destructive">{errors.title}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea
                id="ev-desc"
                value={form.description}
                onChange={(e) => field("description", e.target.value)}
                placeholder="What is this event about?"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="ev-date">Date</Label>
                <Input
                  id="ev-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => field("date", e.target.value)}
                  aria-invalid={!!errors.date}
                />
                {errors.date && (
                  <p className="text-xs font-medium text-destructive">{errors.date}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-start">Start time</Label>
                <Input
                  id="ev-start"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => field("startTime", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ev-end">End time</Label>
                <Input
                  id="ev-end"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => field("endTime", e.target.value)}
                  aria-invalid={!!errors.endTime}
                />
                {errors.endTime && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.endTime}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ev-location">Location</Label>
              <Input
                id="ev-location"
                value={form.location}
                onChange={(e) => field("location", e.target.value)}
                placeholder="Where is it happening?"
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
                {editing ? "Save changes" : "Create event"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        title="Delete this event?"
        description={`"${confirm.target?.title ?? ""}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={confirm.loading}
        onConfirm={remove}
      />
    </>
  );
}
