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

// Blocked words list — common offensive/explicit terms
const BLOCKED_WORDS = [
  "fuck", "fck", "shit", "bitch", "btch", "cunt", "dick", "cock", "pussy",
  "ass", "asshole", "bastard", "damn", "slut", "whore", "rape", "rapist",
  "nigger", "nigga", "n1gger", "faggot", "fag", "retard", "tard",
  "kike", "spic", "chink", "gook", "tranny", "homo", "dyke",
  "sex", "porn", "nude", "nudes", "xxx", "fuk", "fuq",
  "kill", "murder", "die", "suicide", "nazi", "hitler", "isis",
  "cocaine", "heroin", "meth", "weed", "drug",
  "anal", "boob", "tit", "tits", "vagina", "penis", "horny",
  "cum", "jizz", "milf", "bdsm", "fetish",
];

export function validateUserId(id: string, isOwner: boolean = false): string | null {
  if (!id) return "User ID is required.";
  if (id.length > 7) return "User ID must be 7 characters or less.";
  if (!/^[A-Za-z0-9_]+$/.test(id)) return "Only letters, numbers, and underscores allowed.";
  const lower = id.toLowerCase();
  for (const word of BLOCKED_WORDS) {
    if (lower.includes(word)) {
      return "This User ID is not allowed. Please choose a different one.";
    }
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
