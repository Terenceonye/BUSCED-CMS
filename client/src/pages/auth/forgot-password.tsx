import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, FieldError } from "./auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { post } from "@/lib/api";

const schema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    try {
      await post("/api/v1/auth/forgot-password", { email: values.email }, {
        allowUnauthorized: true,
      });
      // The OTP screen needs the email to verify against.
      sessionStorage.setItem("reset-email", values.email);
      toast.success("We sent a code to your email");
      navigate("/verify-otp", { state: { email: values.email } });
    } catch (err: any) {
      const message = err?.message || "Could not send the reset code.";
      setError("email", { message });
      toast.error(message);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      description="Enter your account email and we'll send you a verification code."
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
          <Label htmlFor="email">Email address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-9"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </div>
          <FieldError>{errors.email?.message}</FieldError>
        </div>

        <Button type="submit" className="w-full" loading={isSubmitting}>
          Send reset code
        </Button>
      </form>
    </AuthShell>
  );
}
