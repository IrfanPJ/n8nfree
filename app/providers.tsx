"use client";

import React, { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Toaster
      theme={isDark ? "dark" : "light"}
      position="top-right"
      toastOptions={{
        style: isDark
          ? {
              background: "hsl(0 0% 8%)",
              border: "1px solid hsl(0 0% 16%)",
              color: "hsl(0 0% 95%)",
            }
          : {
              background: "hsl(0 0% 100%)",
              border: "1px solid hsl(0 0% 88%)",
              color: "hsl(0 0% 8%)",
            },
      }}
    />
  );
}

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SessionProvider>
        {children}
        <ThemedToaster />
        <ServiceWorkerRegistrar />
      </SessionProvider>
    </ThemeProvider>
  );
}
