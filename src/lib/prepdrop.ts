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

const RESOURCES_KEY = "prepdrop_resources";
const CLAIMED_IDS_KEY = "prepdrop_claimed_ids";
const MY_ID_KEY = "prepdrop_my_id";
const REVIEW_SESSION_KEY = "prepdrop_review_session";
const REVIEW_LOCK_KEY = "prepdrop_review_lock";

export const SUBJECTS: Subject[] = ["Physics", "Chemistry", "Maths", "General"];

// --- Resources ---
export function getResources(): Resource[] {
  try {
    return JSON.parse(localStorage.getItem(RESOURCES_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveResources(resources: Resource[]) {
  localStorage.setItem(RESOURCES_KEY, JSON.stringify(resources));
  window.dispatchEvent(new Event("prepdrop:update"));
}

export function addResource(r: Omit<Resource, "id" | "status" | "submittedAt">) {
  const resources = getResources();
  const newResource: Resource = {
    ...r,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
  resources.push(newResource);
  saveResources(resources);
  claimId(r.userId);
  localStorage.setItem(MY_ID_KEY, r.userId);
  return newResource;
}

export function updateResourceStatus(id: string, status: ResourceStatus) {
  const resources = getResources().map((r) => (r.id === id ? { ...r, status } : r));
  saveResources(resources);
}

export function deleteResource(id: string) {
  saveResources(getResources().filter((r) => r.id !== id));
}

// --- User IDs ---
export function getClaimedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CLAIMED_IDS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function claimId(id: string) {
  const ids = getClaimedIds();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem(CLAIMED_IDS_KEY, JSON.stringify(ids));
  }
}

export function getMyId(): string | null {
  return localStorage.getItem(MY_ID_KEY);
}

// Blocked words — English + Hindi slang/abusive words
// Matched after leetspeak normalization (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, @→a, $→s)
const BLOCKED_WORDS = [
  // English — sexual / explicit
  "fuck", "fuk", "fuq", "fck", "fcuk", "phuck", "mofo", "motherfucker",
  "shit", "shyt", "bullshit",
  "bitch", "btch", "biatch", "biotch",
  "cunt", "kunt", "twat",
  "dick", "dik", "cock", "kock", "knob", "prick", "schlong",
  "pussy", "pusy", "pussi",
  "ass", "asshole", "arse", "arsehole", "bastard", "basterd",
  "slut", "slutty", "whore", "thot", "skank",
  "sex", "sexy", "porn", "porno", "pron", "nude", "nudes", "naked", "xxx", "nsfw",
  "anal", "boob", "boobs", "tit", "tits", "titty", "boobies",
  "vagina", "penis", "horny", "kinky",
  "cum", "jizz", "spunk", "milf", "dilf", "bdsm", "fetish",
  "blowjob", "handjob", "rimjob", "creampie", "gangbang",
  "rape", "rapist", "molest", "pedo", "pedophile",
  // Slurs / hate
  "nigger", "nigga", "niglet", "negro", "coon",
  "faggot", "fag", "fggt", "queer", "tranny", "homo", "dyke",
  "retard", "tard", "spaz", "mongoloid",
  "kike", "spic", "wetback", "chink", "gook", "raghead",
  "nazi", "hitler", "kkk", "isis",
  // Violence / drugs
  "kill", "murder", "suicide", "kys", "shoot", "stab", "bomb", "terrorist",
  "cocaine", "coke", "heroin", "meth", "crack", "weed", "ganja", "drug", "drugs",
  "lsd", "mdma", "ecstasy",
  // Hindi / Hinglish slang & abuses
  "chutiya", "chutia", "chutya", "chut", "lund", "lavda", "lawda", "laund",
  "bhosdi", "bhosda", "bhosdike", "bsdk", "bhsdk",
  "madarchod", "mdrchd", "behenchod", "bhenchod", "bhanchod",
  "gandu", "gaandu", "gand", "gaand",
  "randi", "rndi", "raand", "saala", "kutiya", "kamina",
  "harami", "haraami", "haramzada", "haramkhor",
  "chinaal", "chinal", "tatti", "jhaant", "jhantu",
  "loda", "lodu", "lawde", "launda", "laundi",
  "kameena", "fattu", "phattu", "chakka",
];

function normalizeLeet(s: string): string {
  return s
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/[^a-z]/g, "");
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
    const myId = getMyId();
    if (getClaimedIds().includes(id) && myId !== id) {
      return "This User ID is already taken. Please choose a different one.";
    }
  }
  return null;
}


export function checkUserId(id: string): string | null {
  const myId = getMyId();
  return validateUserId(id, myId === id);
}

// --- Review Session ---
const REVIEW_PASSWORD = "prepdrop123";

export function reviewLogin(password: string): { ok: boolean; error?: string } {
  if (password !== REVIEW_PASSWORD) return { ok: false, error: "Incorrect password." };
  // Check global lock — only one session allowed
  const lock = localStorage.getItem(REVIEW_LOCK_KEY);
  const mySession = sessionStorage.getItem(REVIEW_SESSION_KEY);
  if (lock && lock !== mySession) {
    // Verify the lock is still alive (heartbeat within last 30s)
    try {
      const parsed = JSON.parse(lock);
      if (Date.now() - parsed.heartbeat < 30000) {
        return { ok: false, error: "A review session is already active." };
      }
    } catch {
      // stale, take over
    }
  }
  const sessionId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(REVIEW_SESSION_KEY, sessionId);
  localStorage.setItem(REVIEW_LOCK_KEY, JSON.stringify({ id: sessionId, heartbeat: Date.now() }));
  return { ok: true };
}

export function reviewIsLoggedIn(): boolean {
  const sessionId = sessionStorage.getItem(REVIEW_SESSION_KEY);
  if (!sessionId) return false;
  const lock = localStorage.getItem(REVIEW_LOCK_KEY);
  if (!lock) return false;
  try {
    const parsed = JSON.parse(lock);
    return parsed.id === sessionId;
  } catch {
    return false;
  }
}

export function reviewHeartbeat() {
  const sessionId = sessionStorage.getItem(REVIEW_SESSION_KEY);
  if (!sessionId) return;
  localStorage.setItem(REVIEW_LOCK_KEY, JSON.stringify({ id: sessionId, heartbeat: Date.now() }));
}

export function reviewLogout() {
  sessionStorage.removeItem(REVIEW_SESSION_KEY);
  localStorage.removeItem(REVIEW_LOCK_KEY);
}

// --- URL validation ---
const ALLOWED_DOMAINS = [
  "play.google.com", "apps.apple.com", "t.me", "telegram.me", "telegram.org",
  "youtube.com", "youtu.be", "m.youtube.com",
  "unacademy.com", "physicswallah.live", "pw.live", "vedantu.com",
  "byjus.com", "khanacademy.org", "coursera.org", "edx.org", "udemy.com",
  "github.com", "gitlab.com",
  "drive.google.com", "docs.google.com",
  "notion.so", "notion.site",
  "nptel.ac.in", "swayam.gov.in", "nta.ac.in",
];

const BLOCKED_DOMAINS = [
  // URL shorteners (hide real destination)
  "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd", "buff.ly",
  "cutt.ly", "shorte.st", "rebrand.ly", "rb.gy", "tiny.cc", "shorturl.at",
  "lnkd.in", "shrt.li", "adf.ly", "linktr.ee",
  // Adult / porn
  "pornhub.com", "xvideos.com", "xnxx.com", "redtube.com", "youporn.com",
  "xhamster.com", "brazzers.com", "onlyfans.com", "stripchat.com",
  "chaturbate.com", "spankbang.com", "porn.com", "sex.com", "tube8.com",
  // Known malware / piracy
  "thepiratebay.org", "1337x.to", "kickass.to",
  // Non-study / social / streaming / shopping / AI chat
  "youtube.com", "youtu.be", "m.youtube.com",
  "reddit.com",
  "claude.ai", "openai.com", "chatgpt.com",
  "twitter.com", "x.com",
  "instagram.com", "facebook.com", "tiktok.com", "snapchat.com",
  "netflix.com",
  "amazon.com", "flipkart.com",
];

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

function domainMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith("." + domain);
}

export function validateUrl(url: string): UrlValidation {
  if (!url) return { ok: false, error: "Please enter a valid URL." };
  if (!/^https?:\/\//i.test(url)) {
    return { ok: false, error: "Please enter a valid URL." };
  }
  const host = getHostname(url);
  if (!host || !/\.[a-z]{2,}$/i.test(host)) {
    return { ok: false, error: "Please enter a valid URL." };
  }
  for (const bad of BLOCKED_DOMAINS) {
    if (domainMatches(host, bad)) {
      return { ok: false, error: "This URL is not allowed on PrepDrop." };
    }
  }
  for (const good of ALLOWED_DOMAINS) {
    if (domainMatches(host, good)) {
      return { ok: true };
    }
  }
  return {
    ok: true,
    unverified: true,
    warning: "This link will go through extra review before publishing.",
  };
}

export function isUrlUnverified(url: string): boolean {
  const v = validateUrl(url);
  return v.ok === true && v.unverified === true;
}
