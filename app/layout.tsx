import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Everywon Admin",
  description: "Korean clinic onboarding for the Everywon Firestore project.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
