import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/misc";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm";
import { useResource } from "@/hooks/use-resource";
import { del, patch } from "@/lib/api";
import { formatDate, toPlainText, truncate } from "@/lib/utils";

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  newsTag?: string;
  isActive?: boolean;
  createdAt?: string;
  images?: { url: string }[];
}

interface Meta {
  total: number;
  page: number;
  totalPages: number;
  activeCount: number;
}

const PAGE_SIZE = 10;

export default function NewsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [page, setPage] = React.useState(1);

  // Debounce the search box so typing does not fire a request per keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const query = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });
  if (debounced) query.set("search", debounced);
  if (status !== "all") query.set("status", status);

  const { data, meta, loading, error, reload } = useNewsList(query.toString());
  const confirm = useConfirm<NewsItem>();

  const toggleStatus = async (item: NewsItem, next: boolean) => {
    try {
      await patch(`/api/v1/admin/news/${item._id}/status`, { isActive: next });
      toast.success(next ? "Article published" : "Moved to draft");
      reload();
    } catch (err: any) {
      toast.error(err?.message || "Could not update the status.");
    }
  };

  const remove = async () => {
    if (!confirm.target) return;
    confirm.setLoading(true);
    try {
      await del(`/api/v1/admin/news/${confirm.target._id}`);
      toast.success("Article deleted");
      confirm.close();
      // Step back a page if the last row on this page was removed.
      if (data.length === 1 && page > 1) setPage((p) => p - 1);
      else reload();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete the article.");
      confirm.setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="News"
        description={
          meta
            ? `${meta.total} article${meta.total === 1 ? "" : "s"} · ${meta.activeCount} active`
            : "Create and manage published articles."
        }
        actions={
          <Button asChild>
            <Link to="/news/new">
              <Plus />
              New article
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or tag..."
                className="pl-9"
              />
            </div>
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Draft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : data.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title={debounced || status !== "all" ? "No matching articles" : "No articles yet"}
            description={
              debounced || status !== "all"
                ? "Try a different search term or filter."
                : "Publish your first article to get started."
            }
            action={
              debounced || status !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatus("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button asChild size="sm">
                  <Link to="/news/new">
                    <Plus />
                    New article
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead className="hidden md:table-cell">Tag</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-[60px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.images?.[0]?.url ? (
                          <img
                            src={item.images[0].url}
                            alt=""
                            className="h-11 w-16 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-md bg-muted">
                            <Newspaper className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            to={`/news/${item._id}/edit`}
                            className="line-clamp-1 text-sm font-medium hover:underline"
                          >
                            {item.title}
                          </Link>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {truncate(toPlainText(item.content), 80)}
                          </p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary">{item.newsTag || "GENERAL"}</Badge>
                    </TableCell>

                    <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground lg:table-cell">
                      {formatDate(item.createdAt)}
                    </TableCell>

                    <TableCell>
                      <Switch
                        checked={!!item.isActive}
                        onCheckedChange={(v) => toggleStatus(item, v)}
                        aria-label="Toggle active"
                      />
                    </TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/news/${item._id}/edit`)}
                          >
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

            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Page {meta.page} of {meta.totalPages}
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
                    disabled={page >= meta.totalPages}
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

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        title="Delete this article?"
        description={`"${confirm.target?.title ?? ""}" and its images will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={confirm.loading}
        onConfirm={remove}
      />
    </>
  );
}

/** Wraps useResource so the list and its pagination meta come back together. */
function useNewsList(queryString: string) {
  const res = useResource<{ items: NewsItem[]; meta: Meta | null }>(
    `/api/v1/admin/news?${queryString}`,
    (p) => ({ items: (p.data ?? []) as NewsItem[], meta: (p.meta ?? null) as Meta | null }),
  );

  return {
    data: res.data?.items ?? [],
    meta: res.data?.meta ?? null,
    loading: res.loading,
    error: res.error,
    reload: res.reload,
  };
}
