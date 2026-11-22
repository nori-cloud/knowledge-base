import { posix } from "node:path";
import type { LinkContext } from "../models";

const absolute = /^[a-z][a-z0-9+.-]*:|^\/\/|^#|^\//i;

/**
 * Rewrites a relative link found in `docs/<from>` of a source repository.
 *
 * Pages inside `docs/` become site URLs; everything else becomes a GitHub URL.
 * Returns `undefined` when the link should stay as written.
 */
export function rewriteLink(
  from: string,
  href: string,
  context: LinkContext,
  kind: "link" | "image" = "link",
): string | undefined {
  if (!href || absolute.test(href)) return undefined;

  const hashAt = href.search(/[?#]/);
  const pathname = decodeURIComponent(
    hashAt === -1 ? href : href.slice(0, hashAt),
  );
  const suffix = hashAt === -1 ? "" : href.slice(hashAt);
  if (!pathname) return undefined;

  const inDocs = posix.normalize(posix.join(posix.dirname(from), pathname));
  if (!inDocs.startsWith("..")) {
    const isPage = inDocs.endsWith(".md") || !posix.extname(inDocs);
    if (isPage) {
      const page = inDocs.replace(/\.md$/, "").replace(/(^|\/)index$/, "");
      const slug = posix.join(context.mount, page);
      return `${context.baseUrl}/${slug}`.replace(/\/$/, "") + suffix;
    }
  }

  const inRepo = posix.normalize(
    posix.join("docs", posix.dirname(from), pathname),
  );
  if (inRepo.startsWith("..")) return undefined;
  if (kind === "image") {
    return `https://raw.githubusercontent.com/${context.repo}/${context.ref}/${inRepo}${suffix}`;
  }
  return `https://github.com/${context.repo}/blob/${context.ref}/${inRepo}${suffix}`;
}

/** Page path (relative to `docs/`) to its virtual path under a mount. */
export function mountPath(mount: string, path: string): string {
  return posix.join(mount, path);
}
