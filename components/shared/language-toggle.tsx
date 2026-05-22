"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { setLocaleCookie } from "@/actions/locale";
import { useLocaleStore } from "@/store/locale-store";

export function LanguageToggle() {
  const [isPending, startTransition] = useTransition();
  const { locale, setLocale } = useLocaleStore();

  function toggle() {
    const next = locale === "en" ? "ar" : "en";
    setLocale(next);
    startTransition(() => {
      setLocaleCookie(next);
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      disabled={isPending}
      className="text-muted-foreground hover:text-foreground font-mono text-xs"
      title={locale === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
    >
      <Languages className="h-4 w-4" />
    </Button>
  );
}
