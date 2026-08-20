import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ImagePlus,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";
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
import { Switch } from "@/components/ui/misc";
import { ErrorState, LoadingBlock } from "@/components/ui/states";
import { api, get } from "@/lib/api";
import { cn } from "@/lib/utils";

interface NewsImage {
  url: string;
  filename?: string;
  originalName?: string;
}

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  newsTag?: string;
  isActive?: boolean;
  images?: NewsImage[];
}

/** Server limit is 250kB per image (config/multerConfigNews.js). */
const MAX_IMAGE_BYTES = 250 * 1024;
const ACCEPTED = ["image/jpg", "image/jpeg", "image/png"];
const MAX_IMAGES = 10;

export default function NewsEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(isEdit);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [newsTag, setNewsTag] = React.useState("GENERAL");
  const [isActive, setIsActive] = React.useState(true);
  // The value as loaded, so the switch can flag that it is not saved yet.
  const [savedActive, setSavedActive] = React.useState(true);

  const [existingImages, setExistingImages] = React.useState<NewsImage[]>([]);
  const [removedImages, setRemovedImages] = React.useState<string[]>([]);
  const [newFiles, setNewFiles] = React.useState<File[]>([]);
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [dragging, setDragging] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await get<{ data: NewsItem }>(`/api/v1/admin/news/${id}`);
      const item = res.data;
      setTitle(item.title ?? "");
      setContent(item.content ?? "");
      setNewsTag(item.newsTag ?? "GENERAL");
      setIsActive(item.isActive ?? true);
      setSavedActive(item.isActive ?? true);
      setExistingImages(item.images ?? []);
    } catch (err: any) {
      setLoadError(err?.message || "Could not load this article.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Object URLs must be revoked when the previews change or the page unmounts.
  React.useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newFiles]);

  const addFiles = (incoming: FileList | File[]) => {
    const accepted: File[] = [];
    const rejected: string[] = [];

    Array.from(incoming).forEach((file) => {
      if (!ACCEPTED.includes(file.type)) {
        rejected.push(`${file.name} (only JPG and PNG allowed)`);
      } else if (file.size > MAX_IMAGE_BYTES) {
        rejected.push(`${file.name} (over 250KB)`);
      } else {
        accepted.push(file);
      }
    });

    const room = MAX_IMAGES - existingImages.length - newFiles.length;
    if (accepted.length > room) {
      rejected.push(`Only ${MAX_IMAGES} images are allowed per article`);
      accepted.length = Math.max(room, 0);
    }

    if (rejected.length) toast.error(rejected.join("\n"));
    if (accepted.length) setNewFiles((prev) => [...prev, ...accepted]);
  };

  const removeExisting = (img: NewsImage) => {
    setExistingImages((prev) => prev.filter((i) => i.url !== img.url));
    setRemovedImages((prev) => [...prev, img.url]);
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Title is required";
    else if (title.trim().length < 3) next.title = "Title must be at least 3 characters";
    if (!content.trim()) next.content = "Content is required";
    if (!isEdit && newFiles.length === 0) {
      next.images = "Add at least one image";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    const form = new FormData();
    form.append("title", title.trim());
    form.append("content", content.trim());
    form.append("newsTag", newsTag.trim() || "GENERAL");
    form.append("isActive", String(isActive));
    newFiles.forEach((f) => form.append("images", f));
    if (removedImages.length) {
      form.append("removeImages", JSON.stringify(removedImages));
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api(`/api/v1/admin/news/${id}`, { method: "PUT", body: form });
        toast.success("Article updated");
      } else {
        await api("/api/v1/admin/news", { method: "POST", body: form });
        toast.success("Article created");
      }
      navigate("/news");
    } catch (err: any) {
      toast.error(err?.message || "Could not save the article.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingBlock />;
  if (loadError) {
    return (
      <Card>
        <ErrorState message={loadError} onRetry={load} />
      </Card>
    );
  }

  const totalImages = existingImages.length + newFiles.length;

  return (
    <form onSubmit={submit}>
      <PageHeader
        title={isEdit ? "Edit article" : "New article"}
        description={
          isEdit
            ? "Update the content, images or visibility of this article."
            : "Write a new article and publish it to the website."
        }
        actions={
          <>
            <Button asChild variant="outline" type="button">
              <Link to="/news">
                <ArrowLeft />
                Back
              </Link>
            </Button>
            <Button type="submit" loading={saving}>
              <Save />
              {isEdit ? "Save changes" : "Publish"}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>
                The headline and body shown on the website.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter the article headline"
                  aria-invalid={!!errors.title}
                />
                {errors.title && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.title}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Titles are stored in uppercase and must be unique.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Body</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write the article. Basic HTML is supported."
                  className="min-h-[320px] font-mono text-[13px] leading-relaxed"
                  aria-invalid={!!errors.content}
                />
                {errors.content && (
                  <p className="text-xs font-medium text-destructive">
                    {errors.content}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
              <CardDescription>
                JPG or PNG, up to 250KB each ({totalImages}/{MAX_IMAGES} used).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50",
                  errors.images && "border-destructive",
                )}
              >
                <ImagePlus className="mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Drop images here or click to browse
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  JPG or PNG · max 250KB each
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
              {errors.images && (
                <p className="text-xs font-medium text-destructive">
                  {errors.images}
                </p>
              )}

              {(existingImages.length > 0 || previews.length > 0) && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {existingImages.map((img) => (
                    <figure
                      key={img.url}
                      className="group relative overflow-hidden rounded-lg border"
                    >
                      <img
                        src={img.url}
                        alt={img.originalName || ""}
                        className="h-28 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeExisting(img)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100"
                        aria-label="Remove image"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </figure>
                  ))}

                  {previews.map((src, i) => (
                    <figure
                      key={src}
                      className="group relative overflow-hidden rounded-lg border border-primary/40"
                    >
                      <img src={src} alt="" className="h-28 w-full object-cover" />
                      <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        New
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setNewFiles((prev) => prev.filter((_, idx) => idx !== i))
                        }
                        className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1 opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100"
                        aria-label="Remove image"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </figure>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  isEdit && isActive !== savedActive && "border-warning bg-warning/5",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Active</p>
                    <p className="text-xs text-muted-foreground">
                      {isActive
                        ? "Visible on the website"
                        : "Hidden from the website"}
                    </p>
                  </div>
                  <Switch
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    aria-label="Toggle active"
                  />
                </div>

                {/* The list page toggles instantly; here it is part of the form,
                    so say so rather than letting it look like it did nothing. */}
                {isEdit && isActive !== savedActive && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-warning">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Not saved yet - press "Save changes"
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newsTag">Tag</Label>
                <Input
                  id="newsTag"
                  value={newsTag}
                  onChange={(e) => setNewsTag(e.target.value)}
                  placeholder="GENERAL"
                />
                <p className="text-xs text-muted-foreground">
                  Used to group articles. Stored in uppercase.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How the headline will read.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold uppercase">
                {title.trim() || "Untitled article"}
              </p>
              <p className="mt-2 line-clamp-4 text-xs text-muted-foreground">
                {content.replace(/<[^>]*>/g, " ").trim() ||
                  "The article body will appear here."}
              </p>
            </CardContent>
          </Card>

          {saving && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Uploading, please wait...
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
