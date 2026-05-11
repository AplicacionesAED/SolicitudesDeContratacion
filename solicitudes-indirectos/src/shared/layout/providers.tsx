"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/shared/ui/toaster";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster />
    </SessionProvider>
  );
}
