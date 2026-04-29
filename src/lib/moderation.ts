import { supabase } from "@/integrations/supabase/client";
import { getResources } from "./prepdrop";

export type ModerationCheck = "url_safety" | "name_check" | "spam" | "duplicate";

export interface UrlSafetyResult { safe: boolean; reason: string }
export interface NameCheckResult { clean: boolean; reason: string }
export interface SpamResult { spam: boolean; reason: string }
export interface DuplicateResult { duplicate: boolean; matchIndex: number | null; reason: string }

async function callModerate<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("moderate", { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result as T;
}

export const aiCheckUrl = (url: string) =>
  callModerate<UrlSafetyResult>({ check: "url_safety", url });

export const aiCheckName = (name: string) =>
  callModerate<NameCheckResult>({ check: "name_check", name });

export const aiCheckSpam = (name: string, url: string) =>
  callModerate<SpamResult>({ check: "spam", name, url });

export const aiCheckDuplicate = (candidate: { name: string; url: string }) => {
  const existing = getResources().map((r) => ({ name: r.name, url: r.url }));
  return callModerate<DuplicateResult>({ check: "duplicate", candidate, existing });
};

export interface FullModerationReport {
  url: UrlSafetyResult;
  name: NameCheckResult;
  spam: SpamResult;
  duplicate: DuplicateResult;
}

export async function runFullModeration(name: string, url: string): Promise<FullModerationReport> {
  const [u, n, s, d] = await Promise.all([
    aiCheckUrl(url),
    aiCheckName(name),
    aiCheckSpam(name, url),
    aiCheckDuplicate({ name, url }),
  ]);
  return { url: u, name: n, spam: s, duplicate: d };
}
