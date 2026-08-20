import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/app-context";
import { AppLayout } from "@/components/layout/app-layout";

import LoginPage from "@/pages/auth/login";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import VerifyOtpPage from "@/pages/auth/verify-otp";
import ResetPasswordPage from "@/pages/auth/reset-password";

import DashboardPage from "@/pages/cms/dashboard";
import NewsListPage from "@/pages/cms/news-list";
import NewsEditorPage from "@/pages/cms/news-editor";
import EventsPage from "@/pages/cms/events";
import GalleryPage from "@/pages/cms/gallery";
import HeroImagesPage from "@/pages/cms/hero-images";
import FacultiesPage from "@/pages/cms/faculties";
import DepartmentsPage from "@/pages/cms/departments";
import ProgramTypesPage from "@/pages/cms/program-types";
import ProgramsPage from "@/pages/cms/programs";
import StaffPage from "@/pages/cms/staff";
import AiPage from "@/pages/cms/ai";
import SettingsPage from "@/pages/cms/settings";
import ChangePasswordPage from "@/pages/cms/change-password";
import NotFoundPage from "@/pages/cms/not-found";

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Blocks the CMS shell until a valid session is confirmed. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

/** Keeps signed-in users out of the auth screens. */
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  if (!ready) return <FullPageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <RedirectIfAuthed>
            <ForgotPasswordPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/verify-otp"
        element={
          <RedirectIfAuthed>
            <VerifyOtpPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/reset-password"
        element={
          <RedirectIfAuthed>
            <ResetPasswordPage />
          </RedirectIfAuthed>
        }
      />

      {/* CMS */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/news" element={<NewsListPage />} />
        <Route path="/news/new" element={<NewsEditorPage />} />
        <Route path="/news/:id/edit" element={<NewsEditorPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/hero-images" element={<HeroImagesPage />} />
        <Route path="/faculties" element={<FacultiesPage />} />
        <Route path="/departments" element={<DepartmentsPage />} />
        <Route path="/program-types" element={<ProgramTypesPage />} />
        <Route path="/programs" element={<ProgramsPage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="/ai" element={<AiPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Legacy EJS URLs */}
      <Route path="/adminlogin" element={<Navigate to="/login" replace />} />
      <Route path="/verify-email" element={<Navigate to="/forgot-password" replace />} />
      <Route path="/new-password" element={<Navigate to="/reset-password" replace />} />
    </Routes>
  );
}
