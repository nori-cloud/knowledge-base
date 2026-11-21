import { deepSeek } from "@ai-sdk/deepseek";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  type InferToolOutput,
  stepCountIs,
  streamText,
  tool,
  toUIMessageStream,
} from "ai";
import { Document, type DocumentData } from "flexsearch";
import { z } from "zod";
import { getSource } from "@/lib/source";
import type { ChatUIMessage, SearchTool } from "../../../components/ai/search";

interface CustomDocument extends DocumentData {
  url: string;
  title: string;
  description: string;
  content: string;
}
const searchServers = new WeakMap<
  Awaited<ReturnType<typeof getSource>>,
  Promise<Document<CustomDocument>>
>();

async function createSearchServer(
  source: Awaited<ReturnType<typeof getSource>>,
) {
  const search = new Document<CustomDocument>({
    document: {
      id: "url",
      index: ["title", "description", "content"],
      store: true,
    },
  });

  const docs = await chunkedAll(
    source.getPages().map(async (page) => {
      if (!("getText" in page.data)) return null;

      return {
        title: page.data.title,
        description: page.data.description,
        url: page.url,
        content: await page.data.getText("processed"),
      } as CustomDocument;
    }),
  );

  for (const doc of docs) {
    if (doc) search.add(doc);
  }

  return search;
}

async function chunkedAll<O>(promises: Promise<O>[]): Promise<O[]> {
  const SIZE = 50;
  const out: O[] = [];
  for (let i = 0; i < promises.length; i += SIZE) {
    out.push(...(await Promise.all(promises.slice(i, i + SIZE))));
  }
  return out;
}

/** System prompt, you can update it to provide more specific information */
const systemPrompt = [
  "You are an AI assistant for a documentation site.",
  "Use the `search` tool to retrieve relevant docs context before answering when needed.",
  'A user message may begin with [Client Context], the page they are reading. For questions about "this page", search its title.',
  "The `search` tool returns raw JSON results from documentation. Use those results to ground your answer and cite sources as markdown links using the document `url` field when available.",
  "If you cannot find the answer in search results, say you do not know and suggest a better search query.",
].join("\n");

export async function POST(req: Request) {
  const reqJson = await req.json();

  const result = streamText({
    model: deepSeek(process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash"),
    stopWhen: stepCountIs(5),
    tools: {
      search: searchTool,
    },
    instructions: systemPrompt,
    messages: await convertToModelMessages<ChatUIMessage>(
      reqJson.messages ?? [],
      {
        convertDataPart(part) {
          if (part.type === "data-client")
            return {
              type: "text",
              text: `[Client Context: ${JSON.stringify(part.data)}]`,
            };
        },
      },
    ),
    toolChoice: "auto",
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}

const searchTool = tool({
  description: "Search the docs content and return raw JSON results.",
  inputSchema: z.object({
    query: z.string(),
    limit: z.number().int().min(1).max(100).default(10),
  }),
  async execute({ query, limit }): Promise<InferToolOutput<SearchTool>> {
    const source = await getSource();
    let searchServer = searchServers.get(source);
    if (!searchServer) {
      searchServer = createSearchServer(source);
      searchServers.set(source, searchServer);
      searchServer.catch(() => searchServers.delete(source));
    }
    const search = await searchServer;
    return await search.searchAsync(query, {
      limit,
      merge: true,
      enrich: true,
    });
  },
}) satisfies SearchTool;
