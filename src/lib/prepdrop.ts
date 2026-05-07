import { supabase } from "@/integrations/supabase/client";

export type Subject = "Physics" | "Chemistry" | "Maths" | "General";
export type ResourceType = "app" | "telegram";
export type ResourceStatus = "pending" | "published";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  url: string;
  subject: Subject;
  userId: string;
  status: ResourceStatus;
  submittedAt: string;
}

const REVIEW_SESSION_KEY = "prepdrop_review_session";

export const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Maths", "General"];

// In-memory cache hydrated from Supabase; sync subscribers via window event.
let _resources: Resource[] = [];
let _claimedIds: Set<string> = new Set();
let _myId: string | null = null;
let _initialized = false;

function rowToResource(r: any): Resource {
  return {
    id: r.id,
    name: r.name,
    type: r.type as ResourceType,
    url: r.url,
    subject: r.subject as Subject,
    userId: r.user_id,
    status: r.status as ResourceStatus,
    submittedAt: r.submitted_at,
  };
}

function emit() {
  window.dispatchEvent(new Event("prepdrop:update"));
}

export async function initPrepDrop() {
  if (_initialized) return;
  _initialized = true;
  await Promise.all([refreshResources(), refreshClaimedIds()]);

  supabase
    .channel("resources-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "resources" },
      () => {
        refreshResources();
      }
    )
    .subscribe();

  supabase
    .channel("claimed-ids-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "claimed_ids" },
      () => {
        refreshClaimedIds();
      }
    )
    .subscribe();
}

async function refreshResources() {
  const { data, error } = await supabase
    .from("resources" as any)
    .select("*")
    .order("submitted_at", { ascending: false });
  if (!error && data) {
    _resources = (data as any[]).map(rowToResource);
    emit();
  }
}

async function refreshClaimedIds() {
  const { data, error } = await supabase.from("claimed_ids" as any).select("user_id");
  if (!error && data) {
    _claimedIds = new Set((data as any[]).map((r) => r.user_id));
    emit();
  }
}

// --- Resources ---
export function getResources(): Resource[] {
  return _resources;
}

export async function addResource(r: Omit<Resource, "id" | "status" | "submittedAt">) {
  const { data, error } = await supabase
    .from("resources" as any)
    .insert({
      name: r.name,
      type: r.type,
      url: r.url,
      subject: r.subject,
      user_id: r.userId,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("claimed_ids" as any).upsert({ user_id: r.userId });
  await supabase.from("submission_times" as any).insert({ user_id: r.userId });

  _myId = r.userId;
  await Promise.all([refreshResources(), refreshClaimedIds()]);
  return rowToResource(data);
}

export async function updateResourceStatus(id: string, status: ResourceStatus) {
  await supabase.from("resources" as any).update({ status }).eq("id", id);
  await refreshResources();
}

export async function deleteResource(id: string) {
  await supabase.from("resources" as any).delete().eq("id", id);
  await refreshResources();
}

// --- User IDs ---
export function getClaimedIds(): string[] {
  return Array.from(_claimedIds);
}

export function getMyId(): string | null {
  return _myId;
}

// Blocked words list (unchanged)
const BLOCKED_WORDS = [
  "fuck","fuk","fuq","fck","fcuk","phuck","mofo","motherfucker",
  "shit","shyt","bullshit","bitch","btch","biatch","biotch",
  "cunt","kunt","twat","dick","dik","cock","kock","knob","prick","schlong",
  "pussy","pusy","pussi","ass","asshole","arse","arsehole","bastard","basterd",
  "slut","slutty","whore","thot","skank","sex","sexy","porn","porno","pron",
  "nude","nudes","naked","xxx","nsfw","anal","boob","boobs","tit","tits","titty","boobies",
  "vagina","penis","horny","kinky","cum","jizz","spunk","milf","dilf","bdsm","fetish",
  "blowjob","handjob","rimjob","creampie","gangbang","rape","rapist","molest","pedo","pedophile",
  "nigger","nigga","niglet","negro","coon","faggot","fag","fggt","queer","tranny","homo","dyke",
  "retard","tard","spaz","mongoloid","kike","spic","wetback","chink","gook","raghead",
  "nazi","hitler","kkk","isis","kill","murder","suicide","kys","shoot","stab","bomb","terrorist",
  "cocaine","coke","heroin","meth","crack","weed","ganja","drug","drugs","lsd","mdma","ecstasy",
  "chutiya","chutia","chutya","chut","lund","lavda","lawda","laund",
  "bhosdi","bhosda","bhosdike","bsdk","bhsdk",
  "madarchod","mdrchd","behenchod","bhenchod","bhanchod",
  "gandu","gaandu","gand","gaand","randi","rndi","raand","saala","kutiya","kamina",
  "harami","haraami","haramzada","haramkhor","chinaal","chinal","tatti","jhaant","jhantu",
  "loda","lodu","lawde","launda","laundi","kameena","fattu","phattu","chakka",
];

function normalizeLeet(s: string): string {
  return s.toLowerCase()
    .replace(/0/g,"o").replace(/1/g,"i").replace(/3/g,"e").replace(/4/g,"a")
    .replace(/5/g,"s").replace(/7/g,"t").replace(/8/g,"b")
    .replace(/@/g,"a").replace(/\$/g,"s").replace(/[^a-z]/g,"");
}

function containsBlockedWord(id: string): boolean {
  const variants = [id.toLowerCase(), normalizeLeet(id)];
  for (const v of variants) {
    for (const word of BLOCKED_WORDS) {
      if (v.includes(word)) return true;
    }
  }
  return false;
}

export function validateUserId(id: string, isOwner: boolean = false): string | null {
  if (!id) return "User ID is required.";
  if (id.length > 7) return "User ID must be 7 characters or less.";
  if (!/^[A-Za-z0-9_]+$/.test(id)) return "Only letters, numbers, and underscores allowed.";
  if (containsBlockedWord(id)) {
    return "This User ID is not allowed. Please choose a clean, appropriate name.";
  }
  if (!isOwner) {
    if (_claimedIds.has(id) && _myId !== id) {
      return "This User ID is already taken. Please choose a different one.";
    }
  }
  return null;
}

export function checkUserId(id: string): string | null {
  return validateUserId(id, _myId === id);
}

// --- Review Session (sessionStorage only) ---
const REVIEW_PASSWORD = "prepdrop123";

export function reviewLogin(password: string): { ok: boolean; error?: string } {
  if (password !== REVIEW_PASSWORD) return { ok: false, error: "Incorrect password." };
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(REVIEW_SESSION_KEY, sessionId);
  return { ok: true };
}

export function reviewIsLoggedIn(): boolean {
  return !!sessionStorage.getItem(REVIEW_SESSION_KEY);
}

export function reviewHeartbeat() {
  // no-op (kept for API compatibility)
}

export function reviewLogout() {
  sessionStorage.removeItem(REVIEW_SESSION_KEY);
}

// --- URL validation ---
export interface UrlValidation {
  ok: boolean;
  error?: string;
  warning?: string;
  unverified?: boolean;
}

function getHostname(url: string): string | null {
  try {
    const u = new URL(url);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function validateUrl(url: string): UrlValidation {
  if (!url) return { ok: false, error: "Please enter a valid URL." };
  if (!/^https?:\/\//i.test(url)) return { ok: false, error: "Please enter a valid URL." };
  const host = getHostname(url);
  if (!host || !/\.[a-z]{2,}$/i.test(host)) return { ok: false, error: "Please enter a valid URL." };
  return { ok: true };
}

export function isUrlUnverified(_url: string): boolean {
  return false;
}
