import { getDocsLlms } from "@/lib/source";

export const dynamic = "force-dynamic";

export async function GET() {
  const docsLlms = await getDocsLlms();
  return (
    (await docsLlms.serve("/llms.txt")) ?? new Response(null, { status: 404 })
  );
}
