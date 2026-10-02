import type { ReactNode } from "react";
import { IconApps, IconBolt, IconDoc, IconHeart, IconHistory, IconList, IconFlame, IconBookmark, IconChart, IconPlug, IconMessage } from "../icons";
export interface NavItem {
  to: string; label: string; icon: (p: { size?: number }) => ReactNode; end?: boolean; changelog?: boolean;
}
export const SIDEBAR: Array<{ title: string; items: NavItem[] }> = [
  { title: "概览", items: [
    { to: "/", label: "雷达总览", icon: IconBolt, end: true },
  ] },
  { title: "AI 内容", items: [
    { to: "/discover", label: "精选", icon: IconBolt },
    { to: "/all", label: "全部 AI 动态", icon: IconList },
    { to: "/hot", label: "热点榜", icon: IconFlame },
    { to: "/daily", label: "AI 日报", icon: IconDoc },
    { to: "/topics", label: "主题", icon: IconApps },
    { to: "/starred", label: "收藏", icon: IconBookmark },
    { to: "/side-hustles", label: "精选副业", icon: IconList },
  ] },
  { title: "模型与工具", items: [
    { to: "/leaderboard", label: "模型榜", icon: IconChart },
    { to: "/monitor", label: "重置监控", icon: IconHistory },
    { to: "/agent", label: "Agent 接入", icon: IconPlug },
  ] },
  { title: "站点服务", items: [
    { to: "/guide", label: "使用指南", icon: IconDoc },
    { to: "/about", label: "关于雷达", icon: IconHeart },
    { to: "/changelog", label: "更新日志", icon: IconHistory, changelog: true },
    { to: "/feedback", label: "反馈", icon: IconMessage },
  ] },
];
export const TABBAR: NavItem[] = [
  { to: "/", label: "总览", icon: IconBolt, end: true },
  { to: "/monitor", label: "监控", icon: IconHistory },
  { to: "/discover", label: "精选", icon: IconBolt },
  { to: "/starred", label: "收藏", icon: IconBookmark },
  { to: "/more", label: "更多", icon: IconApps },
];
export const MORE_PATHS = ["/more", "/platform", "/guide", "/about", "/terms", "/privacy", "/all", "/hot", "/daily", "/weekly", "/monthly", "/topics", "/leaderboard", "/codex-reset", "/agent", "/changelog", "/feedback", "/side-hustles"];
export function tabIsActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  if (item.to === "/monitor" && (pathname === "/history" || pathname.startsWith("/reset-events/"))) return true;
  if (item.to === "/daily" && /^\/(weekly|monthly)(\/|$)/.test(pathname)) return true;
  if (item.to === "/more") return MORE_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
  return pathname === item.to || pathname.startsWith(item.to + "/");
}
