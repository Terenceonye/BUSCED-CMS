import * as React from "react";
import { Bot, MessageSquare, MoreHorizontal, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm";
import { del, get, post, put } from "@/lib/api";
import { truncate } from "@/lib/utils";

interface Faq {
  _id: string;
  question: string;
  answer: string;
}

export default function AiPage() {
  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="Train the chatbot with FAQs and background context."
      />

      <Tabs defaultValue="faqs">
        <TabsList>
          <TabsTrigger value="faqs">
            <MessageSquare className="h-4 w-4" />
            FAQs
          </TabsTrigger>
          <TabsTrigger value="context">
            <Bot className="h-4 w-4" />
            Context
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faqs">
          <FaqManager />
        </TabsContent>

        <TabsContent value="context">
          <ContextEditor />
        </TabsContent>
      </Tabs>
    </>
  );
}

function FaqManager() {
  const [rows, setRows] = React.useState<Faq[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Faq | null>(null);
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  const confirm = useConfirm<Faq>();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await get("/api/v1/faqs");
      setRows((payload?.faqs ?? []) as Faq[]);
    } catch (err: any) {
      setError(err?.message || "Could not load FAQs.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.question?.toLowerCase().includes(q) || r.answer?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openCreate = () => {
    setEditing(null);
    setQuestion("");
    setAnswer("");
    setErrors({});
    setOpen(true);
  };

  const openEdit = (row: Faq) => {
    setEditing(row);
    setQuestion(row.question ?? "");
    setAnswer(row.answer ?? "");
    setErrors({});
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!question.trim()) next.question = "Question is required";
    if (!answer.trim()) next.answer = "Answer is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const payload = { question: question.trim(), answer: answer.trim() };
      if (editing) {
        await put(`/api/v1/faqs/${editing._id}`, payload);
        toast.success("FAQ updated");
      } else {
        await post("/api/v1/faqs", payload);
        toast.success("FAQ added");
      }
      setOpen(false);
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not save the FAQ.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm.target) return;
    confirm.setLoading(true);
    try {
      await del(`/api/v1/faqs/${confirm.target._id}`);
      toast.success("FAQ deleted");
      confirm.close();
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete the FAQ.");
      confirm.setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>FAQs</CardTitle>
            <CardDescription>
              Question and answer pairs the assistant can match against.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus />
            Add FAQ
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search FAQs..."
              className="pl-9 sm:max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        {loading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={load} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title={search ? "No matches" : "No FAQs yet"}
            description={
              search
                ? "Try a different search term."
                : "Add question and answer pairs to train the assistant."
            }
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : (
                <Button size="sm" onClick={openCreate}>
                  <Plus />
                  Add FAQ
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead className="hidden md:table-cell">Answer</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row._id}>
                  <TableCell className="text-sm font-medium">
                    {row.question}
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {truncate(row.answer ?? "", 100)}
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
            <DialogDescription>
              Keep answers short and factual for the best matches.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faq-q">Question</Label>
              <Input
                id="faq-q"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What are the admission requirements?"
                aria-invalid={!!errors.question}
              />
              {errors.question && (
                <p className="text-xs font-medium text-destructive">
                  {errors.question}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-a">Answer</Label>
              <Textarea
                id="faq-a"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Write the answer the assistant should give."
                className="min-h-[140px]"
                aria-invalid={!!errors.answer}
              />
              {errors.answer && (
                <p className="text-xs font-medium text-destructive">{errors.answer}</p>
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
                {editing ? "Save changes" : "Add FAQ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        title="Delete this FAQ?"
        description={`"${truncate(confirm.target?.question ?? "", 60)}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        loading={confirm.loading}
        onConfirm={remove}
      />
    </>
  );
}

function ContextEditor() {
  const [content, setContent] = React.useState("");
  const [initial, setInitial] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await get("/api/v1/context");
      const value = payload?.context ?? "";
      setContent(value);
      setInitial(value);
    } catch (err: any) {
      setError(err?.message || "Could not load the context.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Context cannot be empty.");
      return;
    }
    // The endpoint validates a minimum of 20 characters.
    if (content.trim().length < 20) {
      toast.error("Context must be more than 20 characters.");
      return;
    }
    setSaving(true);
    try {
      // The endpoint reads req.body.context, not `content`.
      await put("/api/v1/context", { context: content.trim() });
      setInitial(content.trim());
      toast.success("Context updated");
    } catch (err: any) {
      toast.error(err?.message || "Could not save the context.");
    } finally {
      setSaving(false);
    }
  };

  if (error) {
    return (
      <Card>
        <ErrorState message={error} onRetry={load} />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistant context</CardTitle>
        <CardDescription>
          Background information the assistant uses when no FAQ matches.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <Textarea
            value={loading ? "" : content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            placeholder={loading ? "Loading..." : "Describe the organisation, its programs and any facts the assistant should know."}
            className="min-h-[320px] leading-relaxed"
          />
          <div className="flex items-center gap-3">
            <Button type="submit" loading={saving} disabled={loading || content === initial}>
              <Save />
              Save context
            </Button>
            {content !== initial && !loading && (
              <span className="text-xs text-muted-foreground">
                You have unsaved changes
              </span>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {content.trim().length} characters (minimum 20)
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
