import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Eye, EyeOff, KeyRound, Lock, ShieldCheck, X } from "lucide-react";
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
import { post } from "@/lib/api";
import { useAuth } from "@/context/app-context";
import { cn } from "@/lib/utils";

// Mirrors validatePasswordUpdate on the server (min 6 characters).
const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    message: "New password must be different from the current one",
  });

type FormValues = z.infer<typeof schema>;

const RULES = [
  { label: "At least 6 characters", test: (v: string) => v.length >= 6 },
  { label: "Contains a number", test: (v: string) => /\d/.test(v) },
  { label: "Contains a letter", test: (v: string) => /[a-zA-Z]/.test(v) },
  {
    label: "Contains an uppercase letter",
    test: (v: string) => /[A-Z]/.test(v),
  },
];

function PasswordField({
  id,
  label,
  error,
  register,
  autoComplete,
  placeholder,
}: {
  id: keyof FormValues;
  label: string;
  error?: string;
  register: any;
  autoComplete: string;
  placeholder: string;
}) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="pl-9 pr-9"
          aria-invalid={!!error}
          {...register(id)}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}

export default function ChangePasswordPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const newPassword = watch("newPassword") ?? "";

  const onSubmit = async (values: FormValues) => {
    try {
      await post("/api/v1/auth/change-password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      reset();
      toast.success("Password changed - please sign in again");

      // The old credentials are gone, so end the session deliberately.
      setTimeout(() => {
        logout();
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err: any) {
      // The API returns an array of messages for validation failures.
      const raw = err?.payload?.message ?? err?.message;
      const message = Array.isArray(raw) ? raw.join(". ") : String(raw);

      if (/current password/i.test(message)) {
        setError("currentPassword", { message });
      } else {
        setError("newPassword", { message });
      }
      toast.error(message || "Could not change your password.");
    }
  };

  return (
    <>
      <PageHeader
        title="Change password"
        description="Update the password used to sign in to the CMS."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your password</CardTitle>
            <CardDescription>
              Signed in as <span className="font-medium">{user?.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="max-w-md space-y-4"
              noValidate
            >
              <PasswordField
                id="currentPassword"
                label="Current password"
                error={errors.currentPassword?.message}
                register={register}
                autoComplete="current-password"
                placeholder="Enter your current password"
              />

              <PasswordField
                id="newPassword"
                label="New password"
                error={errors.newPassword?.message}
                register={register}
                autoComplete="new-password"
                placeholder="Enter a new password"
              />

              <ul className="space-y-1.5 rounded-lg bg-muted/50 p-3">
                {RULES.map((rule) => {
                  const ok = rule.test(newPassword);
                  return (
                    <li
                      key={rule.label}
                      className={cn(
                        "flex items-center gap-2 text-xs transition-colors",
                        ok ? "text-success" : "text-muted-foreground",
                      )}
                    >
                      {ok ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>

              <PasswordField
                id="confirmPassword"
                label="Confirm new password"
                error={errors.confirmPassword?.message}
                register={register}
                autoComplete="new-password"
                placeholder="Re-enter the new password"
              />

              <div className="flex gap-2 pt-1">
                <Button type="submit" loading={isSubmitting}>
                  <KeyRound />
                  Update password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reset()}
                  disabled={isSubmitting}
                >
                  Clear
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Keeping your account safe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Use a password you do not use on any other site.</li>
              <li>Mix uppercase, lowercase, numbers and symbols.</li>
              <li>
                You will be signed out after changing it and will need to sign
                in again.
              </li>
              <li>
                Forgot your current password? Sign out and use the reset link on
                the sign-in screen.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
