import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Check, Eye, EyeOff, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, FieldError } from "./auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { post } from "@/lib/api";
import { cn } from "@/lib/utils";

// The User model enforces a 6 character minimum.
const schema = z
  .object({
    newPassword: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(72, "Password is too long"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type FormValues = z.infer<typeof schema>;

const RULES = [
  { label: "At least 6 characters", test: (v: string) => v.length >= 6 },
  { label: "Contains a number", test: (v: string) => /\d/.test(v) },
  {
    label: "Contains a letter",
    test: (v: string) => /[a-zA-Z]/.test(v),
  },
];

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { email?: string; otp?: string } };
  const [show, setShow] = React.useState(false);

  const email = location.state?.email ?? sessionStorage.getItem("reset-email") ?? "";
  const otp = location.state?.otp ?? "";

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const password = watch("newPassword") ?? "";

  // Reaching this page without a verified OTP means the flow was skipped.
  React.useEffect(() => {
    if (!email || !otp) navigate("/forgot-password", { replace: true });
  }, [email, otp, navigate]);

  const onSubmit = async (values: FormValues) => {
    try {
      await post(
        "/api/v1/auth/reset-password",
        { email, otp, newPassword: values.newPassword },
        { allowUnauthorized: true },
      );
      sessionStorage.removeItem("reset-email");
      toast.success("Password updated - please sign in");
      navigate("/login", { replace: true });
    } catch (err: any) {
      const message = err?.message || "Could not reset your password.";
      setError("newPassword", { message });
      toast.error(message);
    }
  };

  return (
    <AuthShell
      title="Set a new password"
      description="Choose a strong password you have not used before."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="newPassword">New password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="newPassword"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Enter new password"
              className="pl-9 pr-9"
              aria-invalid={!!errors.newPassword}
              {...register("newPassword")}
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
          <FieldError>{errors.newPassword?.message}</FieldError>
        </div>

        <ul className="space-y-1.5 rounded-lg bg-muted/50 p-3">
          {RULES.map((rule) => {
            const ok = rule.test(password);
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter new password"
              className="pl-9"
              aria-invalid={!!errors.confirmPassword}
              {...register("confirmPassword")}
            />
          </div>
          <FieldError>{errors.confirmPassword?.message}</FieldError>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Update password
        </Button>
      </form>
    </AuthShell>
  );
}
