export type Evidence = {
  contentHash: string;
  screenshot: string;
  screenshotNote: string;
  url: string;
};
export function matchedEvidence(
  post: { id: string; contentHash: string; url: string },
  registry: Record<string, Evidence>,
) {
  const evidence = registry[post.id];
  return evidence?.contentHash === post.contentHash && evidence.url === post.url
    ? {
        screenshot: evidence.screenshot,
        screenshotNote: evidence.screenshotNote,
      }
    : {};
}
