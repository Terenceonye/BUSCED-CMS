import * as React from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingBlock } from "@/components/ui/states";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api, del, get } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

export interface ManagedImage {
  _id: string;
  url: string;
  altText?: string;
  filename?: string;
  createdAt?: string;
}

interface Props {
  title: string;
  description: string;
  /** Paginated list endpoint, e.g. /api/gallery */
  listUrl: string;
  /** Multipart POST endpoint taking `image` + `altText` */
  uploadUrl: string;
  /** DELETE endpoint prefix, id is appended */
  deleteUrl: string;
  /** Key holding the array in the list response */
  listKey?: string;
  /** Server-side per-file limit, in kB, purely for the helper text. */
  maxKb: number;
}

const PER_PAGE = 12;

export function ImageManagerPage({
  title,
  description,
  listUrl,
  uploadUrl,
  deleteUrl,
  listKey = "images",
  maxKb,
}: Props) {
  const [page, setPage] = React.useState(1);
  const [images, setImages] = React.useState<ManagedImage[]>([]);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [altText, setAltText] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [lightbox, setLightbox] = React.useState<ManagedImage | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const confirm = useConfirm<ManagedImage>();

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sep = listUrl.includes("?") ? "&" : "?";
      const res = await get(`${listUrl}${sep}page=${page}&limit=${PER_PAGE}`);
      setImages((res?.[listKey] ?? []) as ManagedImage[]);
      setTotalPages(Math.max(res?.totalPages ?? 1, 1));
    } catch (err: any) {
      setError(err?.message || "Could not load images.");
    } finally {
      setLoading(false);
    }
  }, [listUrl, listKey, page]);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (incoming?: File | null) => {
    if (!incoming) return;
    if (!["image/jpg", "image/jpeg", "image/png"].includes(incoming.type)) {
      toast.error("Only JPG and PNG images are allowed.");
      return;
    }
    if (incoming.size > maxKb * 1024) {
      toast.error(`Image must be smaller than ${maxKb}KB.`);
      return;
    }
    setFile(incoming);
  };

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Choose an image to upload.");
      return;
    }

    const form = new FormData();
    form.append("image", file);
    form.append("altText", altText.trim() || file.name);

    setUploading(true);
    try {
      await api(uploadUrl, { method: "POST", body: form });
      toast.success("Image uploaded");
      setFile(null);
      setAltText("");
      if (page === 1) await load();
      else setPage(1);
    } catch (err: any) {
      toast.error(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!confirm.target) return;
    confirm.setLoading(true);
    try {
      await del(`${deleteUrl}/${confirm.target._id}`);
      toast.success("Image deleted");
      confirm.close();
      if (images.length === 1 && page > 1) setPage((p) => p - 1);
      else await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not delete the image.");
      confirm.setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title={title} description={description} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Upload panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={upload} className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "relative flex h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed text-center transition-colors",
                  dragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50",
                )}
              >
                {preview ? (
                  <>
                    <img
                      src={preview}
                      alt="Preview"
                      className="h-full w-full object-contain p-2"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow"
                      aria-label="Clear selection"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <ImagePlus className="mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="px-4 text-sm font-medium">
                      Drop an image or click to browse
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG or PNG · max {maxKb}KB
                    </p>
                  </>
                )}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="altText">Caption</Label>
                <Input
                  id="altText"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image"
                />
              </div>

              <Button type="submit" className="w-full" loading={uploading}>
                <Upload />
                Upload image
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Grid */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Library</CardTitle>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight />
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <LoadingBlock />
            ) : error ? (
              <ErrorState message={error} onRetry={load} />
            ) : images.length === 0 ? (
              <EmptyState
                icon={ImagePlus}
                title="No images yet"
                description="Upload your first image using the panel on the left."
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
                {images.map((img) => (
                  <figure
                    key={img._id}
                    className="group relative overflow-hidden rounded-lg border"
                  >
                    <button
                      type="button"
                      onClick={() => setLightbox(img)}
                      className="block w-full"
                    >
                      <img
                        src={img.url}
                        alt={img.altText || ""}
                        loading="lazy"
                        className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </button>

                    <figcaption className="truncate border-t px-2 py-1.5 text-xs text-muted-foreground">
                      {img.altText || "Untitled"}
                    </figcaption>

                    <button
                      type="button"
                      onClick={() => confirm.ask(img)}
                      className="absolute right-1.5 top-1.5 rounded-full bg-background/90 p-1.5 opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100"
                      aria-label="Delete image"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="pr-8 text-base">
              {lightbox?.altText || "Image"}
            </DialogTitle>
          </DialogHeader>
          {lightbox && (
            <>
              <img
                src={lightbox.url}
                alt={lightbox.altText || ""}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
              <p className="text-xs text-muted-foreground">
                Uploaded {formatDate(lightbox.createdAt)}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        title="Delete this image?"
        description="The file will be permanently removed from the server."
        confirmLabel="Delete"
        destructive
        loading={confirm.loading}
        onConfirm={remove}
      />
    </>
  );
}
