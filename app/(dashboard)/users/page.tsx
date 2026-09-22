"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { StudentsTable } from "@/components/users/StudentsTable";

export default function UsersPage() {
  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Users"
        subtitle="Every student registered on prepex, with their onboarding details."
      />

      {/* The table owns its own fetching, searching and paging — the page
          just frames it. */}
      <StudentsTable />
    </div>
  );
}
