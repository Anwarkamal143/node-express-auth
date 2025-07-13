import { ThemeToggle } from "@/components/theme-toggle";
import AuthProvider from "@/providers/auth-provider";
import { Metadata } from "next";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "E Shop Admin Panel",
  description: "Admin Panel to manage operations",
};

type IDashboardProps = {
  children: ReactNode;
};

export default async function SuperAdminLayout({ children }: IDashboardProps) {
  return (
    <AuthProvider>
      {/* h-[calc(100vh-4rem)] */}
      <div className="flex flex-1  flex-col p-1 pt-0 h-full ">
        <ThemeToggle />
        <div className="bg-muted/50 flex-1 rounded-xl h-full">{children}</div>
      </div>
    </AuthProvider>
  );
}
