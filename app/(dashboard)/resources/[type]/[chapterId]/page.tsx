import { notFound } from "next/navigation";
import { getResourceType } from "@/lib/resources/catalog";
import { ResourceChapterView } from "@/components/resources/ResourceChapterView";

/**
 * One chapter's resources of one type, in full — what a row on
 * /resources/[type] opens. Chapters are live data, so nothing is prerendered;
 * the view fetches GET /admin/content/chapters/:chapterId.
 */
export default async function ResourceChapterPage(
  props: PageProps<"/resources/[type]/[chapterId]">,
) {
  const { type: slug, chapterId } = await props.params;
  if (!getResourceType(slug)) notFound();

  // Only plain strings cross into the client view (see [type]/page.tsx).
  return <ResourceChapterView key={`${slug}/${chapterId}`} slug={slug} chapterId={chapterId} />;
}
