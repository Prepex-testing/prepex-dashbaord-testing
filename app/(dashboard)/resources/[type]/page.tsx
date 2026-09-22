import { notFound } from "next/navigation";
import { getResourceType, RESOURCE_TYPE_SLUGS } from "@/lib/resources/catalog";
import { ResourceTypeView } from "@/components/resources/ResourceTypeView";

// The four types are fixed — only their rows are fetched — so the shells can
// all be prerendered.
export function generateStaticParams() {
  return RESOURCE_TYPE_SLUGS.map((type) => ({ type }));
}

export default async function ResourceTypePage(
  props: PageProps<"/resources/[type]">,
) {
  const { type: slug } = await props.params;
  // Validated here so an unknown slug is a 404 rather than an empty table.
  if (!getResourceType(slug)) notFound();

  // Only the slug crosses into the client component, which looks the type up
  // itself: a type definition carries its `toCells` function, and functions
  // can't be serialised across the server/client boundary.
  //
  // Keyed by slug so moving between types remounts the view. Without it, one
  // type's search, subject filter and page would carry over to the next —
  // landing on the lectures table already filtered to page 4 of Physics notes.
  return <ResourceTypeView key={slug} slug={slug} />;
}
