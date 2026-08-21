import * as React from "react";
import { ImagePlus, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm";
import { api, post } from "@/lib/api";
import { useSettings, useTheme } from "@/context/app-context";
import { cn } from "@/lib/utils";

/** Upload field -> the settings key it replaces. */
const IMAGE_FIELDS = [
  {
    field: "logo",
    key: "logoUrl",
    label: "Dashboard logo",
    help: "Full logo shown in the sidebar.",
  },
  {
    field: "logoSmall",
    key: "logoSmallUrl",
    label: "Small logo",
    help: "Used when the sidebar is collapsed.",
  },
  {
    field: "authLogo",
    key: "authLogoUrl",
    label: "Login logo",
    help: "Shown on the sign-in screens.",
  },
  {
    field: "favicon",
    key: "faviconUrl",
    label: "Favicon",
    help: "Browser tab icon.",
  },
] as const;

const MAX_IMAGE_BYTES = 700 * 1024;

export default function SettingsPage() {
  const { settings, refresh } = useSettings();
  const { theme, setTheme } = useTheme();

  const [siteTitle, setSiteTitle] = React.useState(settings.siteTitle);
  const [files, setFiles] = React.useState<Record<string, File | null>>({});
  const [previews, setPreviews] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const confirm = useConfirm<(typeof IMAGE_FIELDS)[number]>();

  // Keep the form in sync when settings finish loading.
  React.useEffect(() => {
    setSiteTitle(settings.siteTitle);
  }, [settings.siteTitle]);

  // Object URLs for the pending uploads.
  React.useEffect(() => {
    const urls: Record<string, string> = {};
    Object.entries(files).forEach(([field, file]) => {
      if (file) urls[field] = URL.createObjectURL(file);
    });
    setPreviews(urls);
    return () => Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  const pick = (field: string, file?: File | null) => {
    if (!file) return;
    const ok = [
      "image/jpg",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
      "image/x-icon",
      "image/vnd.microsoft.icon",
    ];
    if (!ok.includes(file.type)) {
      toast.error("Use a JPG, PNG, WEBP, SVG or ICO file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be smaller than 700KB.");
      return;
    }
    setFiles((f) => ({ ...f, [field]: file }));
  };

  const dirty =
    siteTitle.trim() !== settings.siteTitle ||
    Object.values(files).some(Boolean);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!siteTitle.trim()) {
      setError("Site title cannot be empty.");
      return;
    }
    setError(null);

    const form = new FormData();
    form.append("siteTitle", siteTitle.trim());
    Object.entries(files).forEach(([field, file]) => {
      if (file) form.append(field, file);
    });

    setSaving(true);
    try {
      await api("/api/v1/settings", { method: "PUT", body: form });
      setFiles({});
      await refresh();
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err?.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm.target) return;
    confirm.setLoading(true);
    try {
      await post("/api/v1/settings/reset-image", { field: confirm.target.key });
      await refresh();
      toast.success("Image reset to default");
      confirm.close();
    } catch (err: any) {
      toast.error(err?.message || "Could not reset the image.");
      confirm.setLoading(false);
    }
  };

  return (
    <form onSubmit={save}>
      <PageHeader
        title="Settings"
        description="Branding and appearance for the CMS and its sign-in screens."
        actions={
          <Button type="submit" loading={saving} disabled={!dirty}>
            <Save />
            Save changes
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
              <CardDescription>
                The name shown in the sidebar, browser tab and login screens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="siteTitle">CMS name</Label>
                <Input
                  id="siteTitle"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  placeholder="Enter the CMS name"
                  maxLength={120}
                  aria-invalid={!!error}
                />
                {error && (
                  <p className="text-xs font-medium text-destructive">{error}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Replace any image, or reset it back to the default.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {IMAGE_FIELDS.map((item) => {
                const current = settings[item.key];
                const pending = previews[item.field];
                return (
                  <div key={item.field} className="space-y-2">
                    <Label>{item.label}</Label>

                    <label
                      className={cn(
                        "relative flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed p-3 transition-colors",
                        pending
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50",
                      )}
                    >
                      {pending || current ? (
                        <img
                          src={pending || current}
                          alt={item.label}
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                      )}

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/x-icon"
                        className="hidden"
                        onChange={(e) => {
                          pick(item.field, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />

                      {pending && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setFiles((f) => ({ ...f, [item.field]: null }));
                          }}
                          className="absolute right-2 top-2 rounded-full bg-background/90 p-1 shadow"
                          aria-label="Clear selection"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </label>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{item.help}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => confirm.ask(item)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Applies to this browser only.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(["light", "dark", "system"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTheme(option)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border p-3 text-left text-sm capitalize transition-colors",
                    theme === option
                      ? "border-primary bg-primary/5 font-medium"
                      : "hover:bg-accent",
                  )}
                >
                  {option}
                  {theme === option && (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>How the sidebar header will look.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <img
                  src={previews.logo || settings.logoUrl}
                  alt=""
                  className="h-8 max-w-[140px] object-contain"
                />
              </div>
              <p className="mt-3 truncate text-sm font-medium">
                {siteTitle.trim() || "Untitled CMS"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={confirm.onOpenChange}
        title="Reset this image?"
        description={`The ${confirm.target?.label.toLowerCase() ?? "image"} will go back to the default.`}
        confirmLabel="Reset"
        loading={confirm.loading}
        onConfirm={reset}
      />
    </form>
  );
}
