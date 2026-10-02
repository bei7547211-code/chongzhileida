import { data } from "react-router";
import { apiGet, ApiError } from "../../lib/api.server";

// A missing published run is an expected setup state, not a fabricated empty ranking.
export async function loadLeaderboard<T>(path: string, opts: { signal: AbortSignal }): Promise<T | null> {
  try { return await apiGet<T>(path, opts); }
  catch (error) {
    if (opts.signal.aborted) throw error;
    if (error instanceof ApiError && error.status === 503 && error.code === "leaderboard_not_ready") return null;
    if (error instanceof ApiError && error.status === 404) throw data(null, { status: 404 });
    throw data({ message: "unavailable" }, { status: 503 });
  }
}
