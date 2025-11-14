// src/app/layout.tsx
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "sonner";
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full overflow-x-hidden">
      <body className="min-h-screen overflow-x-hidden antialiased">
        <AuthProvider>
          
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
        <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
