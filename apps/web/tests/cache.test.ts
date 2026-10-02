// Run after `npm run build -w @aihot/web`. Real production server/router, synthetic HTTP API only.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { CATEGORY_KEYS } from "@aihot/contracts/taxonomy";
import { releaseBoundCache } from "../app/lib/api.server.ts";

let web: ChildProcess;
let origin: string;
let logs = "";
let deadline: number;
let refreshAt: string;
let metaDelayMs = 0;
let hotBody: unknown = { computedAt: null, ruleVersion: null, windowHours: 48, entries: [] };
let hotStatus = 200;
let newsBody: unknown = { items: [], sources: [] };
const apiCookies: Array<string | undefined> = [];
const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://api.local");
  apiCookies.push(req.headers.cookie);
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") {
    const respond = () => res.end(JSON.stringify({ changelogVersion: "2026-09-28T12:00" }));
    return metaDelayMs ? setTimeout(respond, metaDelayMs) : respond();
  }
  if (url.pathname === "/api/site/timeline") {
    const filters = { channel: "all", category: url.searchParams.get("category"), tag: null, topic: null };
    res.setHeader("X-Accel-Expires", `@${deadline}`);
    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=30");
    return res.end(JSON.stringify({ filters, cards: [], nextCursor: null, refreshAt, dayCounts: [], hot: null, generatedAt: "2026-09-28T00:00:00Z" }));
  }
  if (url.pathname === "/api/site/reset-relay") {
    res.setHeader("Cache-Control", "no-store");
    return res.end(JSON.stringify({ mode: "snapshot", generatedAt: "2026-09-28T13:00:00Z", events: [], articles: [] }));
  }
  if (url.pathname === "/api/site/hot") { res.statusCode = hotStatus; return res.end(JSON.stringify(hotBody)); }
  if (url.pathname === "/api/site/ai-news") return res.end(JSON.stringify(newsBody));
  if (url.pathname.startsWith("/api/site/leaderboard/")) {
    res.statusCode = 503;
    return res.end(JSON.stringify({ code: "leaderboard_not_ready" }));
  }
  if (url.pathname === "/api/site/echo-client") return res.end(JSON.stringify({ forwarded: req.headers["x-forwarded-for"], real: req.headers["x-real-ip"] }));
  if (url.pathname === "/api/site/items/long-lived") return res.end(JSON.stringify({ id: "long-lived", title: "t" }));
  if (url.pathname === "/api/site/contact") return res.end(JSON.stringify({ wechatQr: "/qr.png", feishuQr: "/qr.png" }));
  if (url.pathname === "/api/site/stories/merged") {
    res.statusCode = 308;
    return res.end(JSON.stringify({ mergedInto: "surviving-story" }));
  }
  res.statusCode = url.pathname.startsWith("/api/admin/") ? 401 : 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => {
  deadline = Math.floor(Date.now() / 1000) + 20;
  refreshAt = new Date((deadline + 5) * 1000).toISOString();
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  web = spawn(process.execPath, [fileURLToPath(new URL("../server.ts", import.meta.url))], {
    env: { ...process.env, WEB_PORT: "0", TRUST_PROXY: "false", API_BASE_URL: `http://127.0.0.1:${(api.address() as AddressInfo).port}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`web did not start: ${logs}`)), 15_000);
    web.on("exit", () => { clearTimeout(timeout); reject(new Error(`web exited: ${logs}`)); });
    web.stderr!.on("data", (chunk) => { logs += String(chunk); });
    web.stdout!.on("data", (chunk) => {
      logs += String(chunk);
      const match = logs.match(/"msg":"web started","port":(\d+)/);
      if (match) {
        origin = `http://127.0.0.1:${match[1]}`;
        clearTimeout(timeout);
        resolve();
      }
    });
  });
});

after(async () => {
  if (web && web.exitCode === null) {
    web.kill("SIGTERM");
    await once(web, "exit");
  }
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
});

test("hot page distinguishes empty data from broken responses and permits full-page retry", async () => {
  const good = hotBody;
  try {
    for (const broken of [null, {}, { ...good as object, entries: [{}] }]) {
      hotBody = broken;
      const res = await fetch(origin + "/hot");
      assert.equal(res.status, 503);
      assert.match(res.headers.get("Cache-Control")!, /no-store/);
      assert.match(await res.text(), /重新加载热点榜/);
    }
    hotBody = good; hotStatus = 500;
    assert.equal((await fetch(origin + "/hot")).status, 503);
    hotStatus = 200;
    const ok = await fetch(origin + "/hot");
    assert.equal(ok.status, 200);
    const body = await ok.text();
    assert.match(body, /榜单尚未生成/);
    assert.doesNotMatch(body, /讨论最多的 10 件事|实时热度/);
    for (const path of ["/hot.data", "/hot.data?_routes=routes%2Fhot"]) {
      const res = await fetch(origin + path);
      assert.equal(res.status, 200);
      assert.match(await res.text(), /windowHours/);
    }
  } finally { hotBody = good; hotStatus = 200; }
});

test("populated hot cards render, malformed badges fail safely, then recover", async () => {
  const good = hotBody;
  const entry = { rank: 1, story: { publicId: "test-story", title: "测试事件：多来源讨论", summary: null },
    heat: 24, trend: "unknown", trendPct: null, badges: ["new"], participantCount: 3, sourceCount: 2,
    sourceNames: ["测试信源一", "测试信源二"], participants: [], spark: [null, 1, 2, 3],
    summary: "仅用于隔离测试，不发布到用户数据。", latest: null, cover: null };
  try {
    hotBody = { computedAt: "2026-09-29T03:00:00Z", ruleVersion: "test", windowHours: 48, entries: [entry] };
    const response = await fetch(origin + "/hot");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /测试事件：多来源讨论/);
    assert.match(html, /href="\/story\/test-story"/);
    for (const patch of [{ badges: ["unsupported"] }, { spark: null }, { participants: [null] }]) {
      hotBody = { ...hotBody as object, entries: [{ ...entry, ...patch }] };
      assert.equal((await fetch(origin + "/hot")).status, 503);
    }
    hotBody = good;
    assert.equal((await fetch(origin + "/hot")).status, 200);
  } finally { hotBody = good; }
});

test("RSS fallback is labelled latest news, links to evidence, and bad payloads cannot crash it", async () => {
  try {
    newsBody = { items: [{ id: "news-1", title: "Public product update", summary: "Short excerpt", url: "https://example.com/update", publishedAt: "2026-09-29T03:00:00Z", source: "Example", category: "官方 / 产品更新" }], sources: [] };
    const response = await fetch(origin + "/hot");
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Public product update/);
    assert.match(html, /尚未生成多来源热度排名/);
    assert.match(html, /href="https:\/\/example.com\/update"/);
    for (const broken of [{ items: null }, { items: [{}], sources: [] }]) {
      newsBody = broken;
      const res = await fetch(origin + "/hot");
      assert.equal(res.status, 200);
      assert.match(await res.text(), /资讯接口暂时不可用/);
    }
  } finally { newsBody = { items: [], sources: [] }; }
});

test("reset preview and client navigation show the correct sections without caching", async () => {
  for (const [path, expected] of [["/", "重置消息"], ["/side-hustles", "有结果"], ["/guide", "一条公告"]]) {
    const res = await fetch(origin + path);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("Cache-Control")!, /no-store/);
    assert.match(await res.text(), new RegExp(expected));
  }
  for (const path of ["/_.data", "/side-hustles.data", "/guide.data"]) {
    const res = await fetch(origin + path);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("Cache-Control")!, /no-store/);
    const body = await res.text();
    assert.ok(body.includes("snapshot"));
    if (path === "/side-hustles.data") assert.ok(body.includes('"/side-hustles"'));
  }
  assert.equal((await fetch(origin + "/platform/unknown")).status, 404);
  assert.equal((await fetch(origin + "/reset-events/unknown")).status, 404);
});

test("restored navigation exposes every content and service section", async () => {
  const body = await (await fetch(origin + "/")).text();
  assert.match(body, /grid-template-columns:repeat\(5, minmax\(0, 1fr\)\)/);
  for (const label of ["全部 AI 动态", "热点榜", "AI 日报", "主题", "收藏", "模型榜", "重置监控", "Agent 接入", "更新日志", "反馈"]) assert.ok(body.includes(label), label);
  const monitor = await fetch(origin + "/codex-reset");
  assert.equal(monitor.status, 200);
  assert.match(await monitor.text(), /不是实时状态/);
  for (const path of ["/leaderboard", "/leaderboard/category/coding", "/leaderboard/sources", "/leaderboard/rules"]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.match(await response.text(), /评测数据尚未接入/);
  }
});

test("monitor consolidates platforms and redirects old entries", async () => {
  for (const path of ["/monitor", "/monitor/codex", "/monitor/claude", "/monitor/grok"]) {
    const res = await fetch(origin + path);
    assert.equal(res.status, 200, path);
    const body = await res.text();
    assert.match(body, /信源与规则/);
    assert.match(body, /全部平台/);
    assert.match(body, /不是实时状态/);
    assert.doesNotMatch(body, /Tibo 重置监控/);
    const sidebar = body.split('aria-label="主导航"')[1]?.split("</nav>")[0] ?? "";
    assert.ok(sidebar.includes('href="/monitor"'));
    assert.doesNotMatch(sidebar, /href="\/platform\/|href="\/monitor\/(codex|claude|grok)"/);
  }
  for (const [oldPath, target] of [["/codex-reset", "/monitor/codex"], ["/platform/claude", "/monitor/claude"], ["/platform/grok", "/monitor/grok"]]) {
    const response = await fetch(origin + oldPath, { redirect: "manual" });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("Location"), target);
  }
  assert.equal((await fetch(origin + "/monitor/unknown")).status, 404);
});

test("public route subsets produce the same complete navigation data; filters still differ", async () => {
  const answers = await Promise.all(["", "?_routes=root", "?_routes=routes%2Fdiscover", "?_routes=unknown"].map(async (query) => {
    const res = await fetch(`${origin}/discover.data${query}`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("Cache-Control")!, /^public,/);
    assert.equal(res.headers.get("X-Accel-Expires"), `@${deadline}`);
    assert.doesNotMatch(res.headers.get("Cache-Control")!, /stale/);
    const body = await res.text();
    assert.ok(body.includes("root") && body.includes("routes/discover"));
    return body;
  }));
  assert.ok(answers.every((body) => body === answers[0]));
  const category = CATEGORY_KEYS.at(-1)!;
  const filtered = await fetch(`${origin}/discover.data?category=${category}&_routes=root`);
  const body = await filtered.text();
  assert.ok(body.includes(category));
  assert.notEqual(body, answers[0]);
});

test("HTML and navigation share freshness; cookies do not personalize public results", async () => {
  const html = await fetch(`${origin}/discover`);
  assert.equal(html.status, 200);
  assert.equal(html.headers.get("X-Accel-Expires"), `@${deadline}`);
  assert.match(await html.text(), /精选/);
  const plain = await fetch(`${origin}/about.data`);
  const signedIn = await fetch(`${origin}/about.data?_routes=root`, { headers: { cookie: "admin_session=private; aihot_vid=reader" } });
  assert.match(plain.headers.get("Cache-Control")!, /^public,/);
  assert.match(plain.headers.get("X-Accel-Expires")!, /^@\d+$/);
  assert.equal(plain.headers.get("Cache-Control"), "public, max-age=300, s-maxage=300, must-revalidate");
  assert.equal(Date.parse(plain.headers.get("Date")!) / 1000 + 300, Number(plain.headers.get("X-Accel-Expires")!.slice(1)));
  assert.equal(signedIn.headers.get("Set-Cookie"), null);
  assert.equal(await signedIn.text(), await plain.text());
  assert.ok(apiCookies.every((cookie) => !cookie));
});

test("missing routes cannot be hidden by a root-only request; errors and redirects stay uncached", async () => {
  for (const pathname of ["/items/missing.data?_routes=root", "/does-not-exist.data?_routes=root", "/items/missing"]) {
    const res = await fetch(origin + pathname);
    assert.equal(res.status, 404, pathname);
    assert.equal(res.headers.get("Cache-Control"), "private, no-store");
    assert.equal(res.headers.get("X-Accel-Expires"), "0");
    await res.text();
  }
  for (const [pathname, target] of [["/story/merged.data?_routes=root", "/story/surviving-story"], ["/discover.data?q=search&_routes=root", "/all?q=search"]]) {
    const res = await fetch(origin + pathname);
    assert.equal(res.status, 202);
    assert.equal(res.headers.get("Cache-Control"), "private, no-store");
    assert.match(await res.text(), new RegExp(target.replace("?", "\\?")));
  }
});

test("admin data and actions never become public cache entries", async () => {
  const admin = await fetch(`${origin}/admin/sources.data?_routes=admin-layout`);
  assert.equal(admin.status, 202);
  assert.equal(admin.headers.get("Cache-Control"), "private, no-store");
  assert.equal(admin.headers.get("X-Accel-Expires"), "0");
  assert.match(await admin.text(), /admin\/login/);
  const action = await fetch(`${origin}/hot.data`, { method: "POST" });
  assert.equal(action.status, 405);
  assert.equal(action.headers.get("Cache-Control"), "private, no-store");
  assert.equal(action.headers.get("X-Accel-Expires"), "0");
  await action.text();
});

test("an elapsed release deadline cannot be extended by a fresh page/data response", async () => {
  const saved = refreshAt;
  refreshAt = new Date(Date.now() - 1000).toISOString();
  try {
    for (const pathname of ["/discover", "/discover.data?_routes=routes%2Fdiscover"]) {
      const res = await fetch(origin + pathname);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("Cache-Control"), "no-cache");
      assert.equal(res.headers.get("X-Accel-Expires"), "0");
      await res.text();
    }
  } finally {
    refreshAt = saved;
  }
  const now = Date.parse("2026-09-28T00:00:00Z");
  const upstream = new Headers({ "X-Accel-Expires": `@${now / 1000 + 7}` });
  const headers = releaseBoundCache(new Date(now + 20_000).toISOString(), 30, now + 2_000, upstream);
  assert.equal(headers["Cache-Control"], "public, max-age=0, s-maxage=5");
  assert.equal(headers["X-Accel-Expires"], upstream.get("X-Accel-Expires"));
});

test("browser freshness shares the selected deadline, including slow sibling loaders", async () => {
  const savedDeadline = deadline;
  const savedRefresh = refreshAt;
  try {
    deadline = Math.floor(Date.now() / 1000) + 20;
    refreshAt = new Date((deadline + 5) * 1000).toISOString();
    for (const pathname of ["/discover", "/discover.data?_routes=routes%2Fdiscover"]) {
      const res = await fetch(origin + pathname);
      const cc = res.headers.get("Cache-Control")!;
      const browser = Number(cc.match(/(?:^|,)\s*max-age=(\d+)/)![1]);
      const shared = Number(cc.match(/(?:^|,)\s*s-maxage=(\d+)/)![1]);
      assert.ok(browser > 0 && browser === shared);
      assert.ok(Date.parse(res.headers.get("Date")!) / 1000 + browser <= deadline);
      assert.equal(res.headers.get("X-Accel-Expires"), `@${deadline}`);
      assert.match(cc, /must-revalidate/);
      assert.doesNotMatch(cc, /stale/);
      await res.text();
    }
    // The selected loader initially grants a positive TTL, but root metadata finishes after it.
    deadline = Math.floor(Date.now() / 1000) + 2;
    refreshAt = new Date((deadline + 5) * 1000).toISOString();
    metaDelayMs = 2300;
    await Promise.all(["/discover", "/discover.data?_routes=routes%2Fdiscover"].map(async (pathname) => {
      const res = await fetch(origin + pathname);
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("Cache-Control"), "no-cache");
      assert.equal(res.headers.get("X-Accel-Expires"), "0");
      await res.text();
    }));
  } finally {
    deadline = savedDeadline;
    refreshAt = savedRefresh;
    metaDelayMs = 0;
  }
});

test("the edge may keep a page longer than browsers, which a withdrawal purge cannot reach", async () => {
  const res = await fetch(`${origin}/items/long-lived.data`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Cache-Control"), "public, max-age=300, s-maxage=600, must-revalidate");
  await res.text();
});

test("browser caching preserves noindex and private sign-in responses", async () => {
  const feedback = await fetch(origin + "/feedback");
  assert.equal(feedback.status, 200);
  assert.match(await feedback.text(), /name="robots" content="noindex/);
  assert.equal(feedback.headers.get("Cache-Control"), "public, max-age=300, s-maxage=300, must-revalidate");
  const login = await fetch(origin + "/admin/login");
  assert.equal(login.status, 200);
  assert.equal(login.headers.get("Cache-Control"), "private, no-store");
  assert.equal(login.headers.get("X-Robots-Tag"), "noindex, nofollow");
  await login.text();
});

test("a visitor cannot name its own address to the api without a trusted proxy in front", async () => {
  const res = await fetch(`${origin}/api/site/echo-client`, { headers: { "X-Forwarded-For": "6.6.6.6", "X-Real-IP": "6.6.6.6" } });
  assert.deepEqual(await res.json(), { forwarded: "127.0.0.1", real: "127.0.0.1" });
});
