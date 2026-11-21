import { renderMermaidSVG } from "beautiful-mermaid";
import { CodeBlock, Pre } from "./codeblock";

export function Mermaid({ chart }: { chart: string }) {
  try {
    const svg = renderMermaidSVG(chart, {
      bg: "var(--color-fd-background)",
      fg: "var(--color-fd-foreground)",
      interactive: true,
      transparent: true,
    });

    return (
      <div
        className="my-6 overflow-x-auto"
        data-mermaid
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is generated at build time from repository-authored diagrams.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  } catch {
    return (
      <CodeBlock title="Mermaid" data-mermaid-fallback>
        <Pre>{chart}</Pre>
      </CodeBlock>
    );
  }
}
