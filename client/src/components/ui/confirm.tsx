import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./misc";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              // Keep the dialog open while the request is in flight; the caller
              // closes it once the action settles.
              e.preventDefault();
              onConfirm();
            }}
            className={cn(
              destructive &&
                buttonVariants({ variant: "destructive" }),
            )}
          >
            {loading ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Small hook that tracks which row a confirm dialog is acting on. */
export function useConfirm<T>() {
  const [target, setTarget] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);

  return {
    target,
    loading,
    open: target !== null,
    ask: (t: T) => setTarget(t),
    close: () => {
      setTarget(null);
      setLoading(false);
    },
    setLoading,
    onOpenChange: (v: boolean) => {
      if (!v) {
        setTarget(null);
        setLoading(false);
      }
    },
  };
}
