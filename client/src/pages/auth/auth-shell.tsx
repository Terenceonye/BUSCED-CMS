import * as React from "react";
import { Link } from "react-router-dom";
import { Monitor, Moon, Sun } from "lucide-react";
import { useSettings, useTheme } from "@/context/app-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HIGHLIGHTS = [
  "Publish news, events and galleries in one place",
  "Manage faculties, departments and programs",
  "Control site branding without touching code",
];

function ThemeCycle() {
  const { theme, setTheme } = useTheme();
  const order = ["light", "dark", "system"] as const;
  const icons = { light: Sun, dark: Moon, system: Monitor };
  const Icon = icons[theme];

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Change theme"
      onClick={() => setTheme(order[(order.indexOf(theme) + 1) % order.length])}
    >
      <Icon className="h-[18px] w-[18px]" />
    </Button>
  );
}

/**
 * Split-screen frame shared by every auth screen: a branded panel on the left
 * (hidden on small screens) and the form on the right.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { settings } = useSettings();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 overflow-hidden bg-primary lg:flex xl:w-[55%]">
        {/* Layered glows for depth */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-[-6rem] right-[-4rem] h-[28rem] w-[28rem] rounded-full bg-black/20 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />
        </div>

        {/* This panel is always on the blue brand colour, so it uses white
            directly. --primary-foreground flips dark in the dark theme, which
            would put near-black text on blue here. */}
        <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white">
          <img
            src={settings.logoUrl}
            alt={settings.siteTitle}
            className="h-11 w-auto max-w-[220px] object-contain brightness-0 invert"
          />

          <div className="max-w-md animate-slide-up">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
              {settings.siteTitle}
            </h1>
            <p className="mt-4 text-lg text-white/80">
              The control room for your website content.
            </p>

            <ul className="mt-10 space-y-4">
              {HIGHLIGHTS.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/70" />
                  <span className="text-sm text-white/80">{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/60">
            &copy; {new Date().getFullYear()} {settings.siteTitle}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col lg:w-1/2 xl:w-[45%]">
        <div className="flex justify-end p-4">
          <ThemeCycle />
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm animate-slide-up">
            <Link to="/login" className="mb-8 flex justify-center lg:hidden">
              <img
                src={settings.authLogoUrl}
                alt={settings.siteTitle}
                className="h-12 w-auto max-w-[200px] object-contain"
              />
            </Link>

            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>

            {children}

            {footer && (
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small helper for consistent inline field errors. */
export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className={cn("text-xs font-medium text-destructive")}>{children}</p>
  );
}
