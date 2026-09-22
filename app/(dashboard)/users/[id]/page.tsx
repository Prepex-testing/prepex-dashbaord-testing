import { StudentProfileView } from "@/components/users/StudentProfileView";

/**
 * The student directory is live data now, so there is no fixed set of ids to
 * prerender — the id is handed to the view, which fetches that student's
 * profile from GET /admin/students/:id.
 *
 * A student who doesn't exist (or has been deleted) surfaces as the view's own
 * "no longer exists" message rather than a 404 page, so the admin keeps the
 * shell and the back link to Users.
 */
export default async function StudentPage(props: PageProps<"/users/[id]">) {
  const { id } = await props.params;

  return <StudentProfileView studentId={id} />;
}
