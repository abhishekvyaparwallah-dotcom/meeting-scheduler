import type { Metadata } from "next";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import SessionProvider from "@/components/session-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meeting Scheduler | Vyapar Wallah",
  description: "Meeting scheduler and client CRM dashboard for Vyapar Wallah."
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await auth();
  return (
    <html lang="en">
      <body>
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
