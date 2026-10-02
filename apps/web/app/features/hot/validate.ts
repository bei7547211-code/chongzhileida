import type { HotResponse } from "@aihot/contracts/site";
import type { NewsResponse } from "@aihot/contracts/ai-news";

export function validNews(value: unknown): value is NewsResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as NewsResponse;
  return Array.isArray(v.items) && Array.isArray(v.sources) && v.items.every(i =>
    i && ["id", "title", "summary", "source", "category"].every(k => typeof i[k as keyof typeof i] === "string") &&
    typeof i.url === "string" && /^https:\/\//.test(i.url) && Number.isFinite(Date.parse(i.publishedAt))) &&
    v.sources.every(s => s && typeof s.id === "string" && typeof s.failed === "boolean" &&
      (s.checkedAt === null || Number.isFinite(Date.parse(s.checkedAt))));
}

/** Reject a broken response as unavailable, never disguise it as an empty ranking. */
export function validHot(value: unknown): value is HotResponse {
  const object = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0;
  const str = (v: unknown) => typeof v === "string";
  const date = (v: unknown) => v === null || typeof v === "string" && Number.isFinite(Date.parse(v));
  if (!object(value) || !date(value.computedAt) || !(value.ruleVersion === null || str(value.ruleVersion)) ||
      !num(value.windowHours) || value.windowHours === 0 || !Array.isArray(value.entries)) return false;
  const ids = new Set<string>();
  return value.entries.every(e => {
    if (!object(e) || !object(e.story) || !str(e.story.publicId) || !str(e.story.title) || ids.has(e.story.publicId)) return false;
    ids.add(e.story.publicId);
    return [e.rank, e.heat, e.participantCount, e.sourceCount].every(num) &&
      ["up", "down", "flat", "new", "unknown"].includes(e.trend) &&
      (e.trendPct === null || typeof e.trendPct === "number" && Number.isFinite(e.trendPct)) &&
      Array.isArray(e.badges) && e.badges.every((b: unknown) => ["surge", "new", "rising"].includes(String(b))) &&
      Array.isArray(e.sourceNames) && e.sourceNames.every(str) &&
      Array.isArray(e.spark) && e.spark.every((n: unknown) => n === null || num(n)) &&
      Array.isArray(e.participants) && e.participants.every((p: unknown) => object(p) && str(p.name) && ["editorial", "signal"].includes(p.kind) && (p.iconUrl === null || str(p.iconUrl))) &&
      (e.summary === null || str(e.summary)) && (e.latest === null || str(e.latest)) &&
      (e.cover === null || object(e.cover) && str(e.cover.url));
  });
}
