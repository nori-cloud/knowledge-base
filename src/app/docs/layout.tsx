import { DocsLayout } from "@/components/ai/layout";
import { baseOptions } from "@/lib/layout.shared";
import { getSource } from "@/lib/source";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: LayoutProps<"/docs">) {
  const source = await getSource();
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
