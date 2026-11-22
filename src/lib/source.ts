import { llms } from "fumadocs-core/source";
import { getSource } from "@/sources/factory";

/** The merged documentation, refreshed when remote sources change. */
export { getSource };

export async function getDocsLlms() {
  return llms(await getSource(), {
    renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
  });
}
