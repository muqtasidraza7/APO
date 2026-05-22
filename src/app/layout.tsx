import type { Metadata } from "next";
import "./globals.css";
import { NavigationLoader } from "./components/NavigationLoader";

export const metadata: Metadata = {
  title: "APO - AI Project Officer",
  description: "AI-powered project management platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <NavigationLoader />
        {children}
      </body>
    </html>
  );
}
