import { generateOGImage } from "fumadocs-ui/og";
import { notFound } from "next/navigation";
import { appName } from "@/lib/shared";
import { getSource } from "@/lib/source";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: RouteContext<"/og/docs/[...slug]">,
) {
  const { slug } = await params;
  const source = await getSource();
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return generateOGImage({
    title: page.data.title,
    description: page.data.description,
    site: appName,
  });
}
