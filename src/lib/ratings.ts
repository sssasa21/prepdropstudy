import { supabase } from "@/integrations/supabase/client";
import { getMyId } from "@/lib/prepdrop";

export interface Rating {
  id: string;
  resource_id: string;
  user_id: string;
  rating: number;
  created_at: string;
}

export interface RatingSummary {
  count: number;
  average: number;
  myRating: number | null;
}

const RATER_ID_KEY = "prepdrop_rater_id";

export function getRaterId(): string {
  const myId = getMyId();
  if (myId) return myId;
  let id = localStorage.getItem(RATER_ID_KEY);
  if (!id) {
    id = `anon_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(RATER_ID_KEY, id);
  }
  return id;
}

let _ratings: Rating[] = [];
let _initialized = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeRatings(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function refreshRatings() {
  const { data, error } = await supabase.from("ratings" as any).select("*");
  if (!error && data) {
    _ratings = data as any as Rating[];
    emit();
  }
}

export async function initRatings() {
  if (_initialized) return;
  _initialized = true;
  await refreshRatings();
  supabase
    .channel("ratings-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ratings" },
      () => refreshRatings()
    )
    .subscribe();
}

export function getRatingSummary(resourceId: string): RatingSummary {
  const raterId = getRaterId();
  const list = _ratings.filter((r) => r.resource_id === resourceId);
  const count = list.length;
  const average = count ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
  const mine = list.find((r) => r.user_id === raterId);
  return { count, average, myRating: mine ? mine.rating : null };
}

export async function rateResource(resourceId: string, rating: number) {
  const userId = getRaterId();
  const { error } = await supabase
    .from("ratings" as any)
    .insert({ resource_id: resourceId, user_id: userId, rating });
  if (error) {
    console.error("[ratings] insert failed:", error);
    throw error;
  }
  await refreshRatings();
}
