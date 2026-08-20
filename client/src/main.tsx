import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import {
  AuthProvider,
  SettingsProvider,
  ThemeProvider,
} from "./context/app-context";
import { TooltipProvider } from "./components/ui/misc";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <TooltipProvider delayDuration={200}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{ className: "font-sans" }}
            />
          </TooltipProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
