import { redirect } from "next/navigation";

// The admin app has no public landing page — the root is just the way in.
export default function RootPage() {
  redirect("/login");
}
