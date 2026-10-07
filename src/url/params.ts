import type { StorySceneId } from "../scenes/ids";
import { ALL_STATUS } from "../types/data";

export type StartMode = "cover" | "story" | "explore";

export type SizeMetric = "floor" | "site" | "power" | "icon";

export type UrlState = {
  start: StartMode;
  scene: StorySceneId | null;
  status: string[];
  protest: boolean | null;
  view: SizeMetric;
  q: string;
  feature: string | null;
};

const STORY_SCENES = new Set<string>([
  "intro",
  "status",
  "energy",
  "energyGas",
  "water",
  "waterStress",
  "waterBaruth",
  "bigtech",
  "bigtechSearch",
  "protests",
  "protestsLayer",
  "outro",
  "outroFaq",
]);

function splitCsv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseStart(raw: string | null): StartMode {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "explore") return "explore";
  if (v === "story" || v === "intro") return "story";
  if (v === "cover") return "cover";
  return "cover";
}

function parseScene(raw: string | null): StorySceneId | null {
  const v = (raw ?? "").trim().toLowerCase();
  if (STORY_SCENES.has(v)) return v as StorySceneId;
  return null;
}

function parseProtest(raw: string | null): boolean | null {
  if (raw == null || raw === "") return null;
  if (raw === "1" || raw.toLowerCase() === "true") return true;
  if (raw === "0" || raw.toLowerCase() === "false") return false;
  return null;
}

function parseView(raw: string | null): SizeMetric {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "power") return "power";
  if (v === "site") return "site";
  if (v === "floor" || v === "area") return "floor";
  if (v === "icon" || v === "symbols" || v === "marker") return "icon";
  return "icon";
}

export function parseUrlState(href: string = window.location.href): UrlState {
  const sp = new URL(href).searchParams;
  return {
    start: parseStart(sp.get("start")),
    scene: parseScene(sp.get("scene")),
    status: splitCsv(sp.get("status")),
    protest: parseProtest(sp.get("protest")),
    view: parseView(sp.get("view") ?? sp.get("size")),
    q: (sp.get("q") ?? "").trim(),
    feature: (sp.get("feature") ?? "").trim() || null,
  };
}

export function serializeUrlState(state: Partial<UrlState>): string {
  const sp = new URLSearchParams();
  if (state.start && state.start !== "cover") sp.set("start", state.start);
  if (state.scene) sp.set("scene", state.scene);
  // All statuses on is the default, and what an absent param parses to.
  if (state.status?.length && !ALL_STATUS.every((st) => state.status?.includes(st))) {
    sp.set("status", state.status.join(","));
  }
  if (state.protest === true) sp.set("protest", "1");
  if (state.protest === false) sp.set("protest", "0");
  if (state.view && state.view !== "icon") sp.set("view", state.view);
  if (state.q) sp.set("q", state.q);
  if (state.feature) sp.set("feature", state.feature);
  return sp.toString();
}

export function writeUrlState(state: Partial<UrlState>): void {
  const current = parseUrlState();
  const merged: UrlState = { ...current, ...state };
  const qs = serializeUrlState(merged);
  const url = new URL(window.location.href);
  url.search = qs ? `?${qs}` : "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  notifyParent(merged);
}

/**
 * When embedded (heisseluft.org), report every state change to the parent page
 * so it can mirror it into its own address bar for sharing. The iframe there is
 * sandboxed without allow-same-origin, so postMessage is the only channel. The
 * payload is the same public query string the map shows in its own URL, hence
 * the "*" target origin.
 */
function notifyParent(state: UrlState): void {
  if (window.parent === window) return;
  const sp = new URLSearchParams(serializeUrlState(state));
  // serializeUrlState omits start=cover, but the embedding page may default to
  // a different start mode, so always state it.
  sp.set("start", state.start);
  window.parent.postMessage({ type: "heisseluft-map:state", search: sp.toString() }, "*");
}
