import { getDocsLlms } from "@/lib/source";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: RouteContext<"/llms.mdx/[...path]">,
) {
  const { path } = await params;
  const docsLlms = await getDocsLlms();
  return (
    (await docsLlms.serve(`/${path.join("/")}`)) ??
    new Response(null, { status: 404 })
  );
}
