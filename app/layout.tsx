import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal QA Tracker",
  description: "Personal QA Productivity & Evaluation Tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
