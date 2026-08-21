import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { AuthShell, FieldError } from "./auth-shell";
import { Button } from "@/components/ui/button";
import { post } from "@/lib/api";
import { cn } from "@/lib/utils";

/** The server generates a 4-digit OTP (crypto.randomInt(1000, 9999)). */
const OTP_LENGTH = 4;

function OtpInput({
  value,
  onChange,
  disabled,
  invalid,
  onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  onComplete?: (v: string) => void;
}) {
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const setChar = (index: number, char: string) => {
    const next = value.split("");
    next[index] = char;
    const joined = next.join("").slice(0, OTP_LENGTH);
    onChange(joined);
    return joined;
  };

  const handleChange = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;

    // Support pasting the whole code into any box.
    if (digits.length > 1) {
      const joined = digits.slice(0, OTP_LENGTH);
      onChange(joined);
      refs.current[Math.min(joined.length, OTP_LENGTH - 1)]?.focus();
      if (joined.length === OTP_LENGTH) onComplete?.(joined);
      return;
    }

    const joined = setChar(index, digits);
    if (index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
    if (joined.length === OTP_LENGTH && !joined.includes("")) {
      onComplete?.(joined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[index]) {
        setChar(index, "");
      } else if (index > 0) {
        refs.current[index - 1]?.focus();
        setChar(index - 1, "");
      }
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1)
      refs.current[index + 1]?.focus();
  };

  return (
    <div className="flex justify-center gap-3" dir="ltr">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "h-14 w-14 rounded-lg border bg-background text-center text-2xl font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50",
            invalid ? "border-destructive" : "border-input",
          )}
        />
      ))}
    </div>
  );
}

export default function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation() as { state?: { email?: string } };

  const email =
    location.state?.email ?? sessionStorage.getItem("reset-email") ?? "";

  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [resending, setResending] = React.useState(false);

  // Without an email there is nothing to verify against.
  React.useEffect(() => {
    if (!email) navigate("/forgot-password", { replace: true });
  }, [email, navigate]);

  const verify = async (value: string) => {
    if (value.length !== OTP_LENGTH) {
      setError(`Enter all ${OTP_LENGTH} digits`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await post("/api/v1/auth/verify-otp", { email, otp: value }, {
        allowUnauthorized: true,
      });
      toast.success("Code verified");
      navigate("/reset-password", { state: { email, otp: value } });
    } catch (err: any) {
      const message = err?.message || "That code is invalid or has expired.";
      setError(message);
      toast.error(message);
      setCode("");
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await post("/api/v1/auth/forgot-password", { email }, { allowUnauthorized: true });
      toast.success("A new code is on its way");
      setCode("");
      setError(null);
    } catch (err: any) {
      toast.error(err?.message || "Could not resend the code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      title="Enter verification code"
      description={`We sent a ${OTP_LENGTH}-digit code to ${email || "your email"}.`}
      footer={
        <Link
          to="/forgot-password"
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Use a different email
        </Link>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void verify(code);
        }}
        className="space-y-6"
      >
        <div className="space-y-3">
          <OtpInput
            value={code}
            onChange={(v) => {
              setCode(v);
              setError(null);
            }}
            onComplete={(v) => void verify(v)}
            disabled={submitting}
            invalid={!!error}
          />
          {error && (
            <div className="text-center">
              <FieldError>{error}</FieldError>
            </div>
          )}
        </div>

        <Button type="submit" className="w-full" loading={submitting}>
          Verify code
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Didn't get it?{" "}
          <button
            type="button"
            onClick={resend}
            disabled={resending}
            className="font-medium text-primary hover:underline disabled:opacity-50"
          >
            {resending ? "Sending..." : "Resend code"}
          </button>
        </p>
      </form>
    </AuthShell>
  );
}
