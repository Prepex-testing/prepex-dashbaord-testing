import { AdminShell } from "@/components/layout/AdminShell";
import { AuthGate } from "@/components/auth/AuthGate";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthGate>
      <AdminShell>{children}</AdminShell>
    </AuthGate>
  );
}
