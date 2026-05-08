import { supabase } from "@/integrations/supabase/client";

export interface UrlAiResult {
  allowed: boolean;
  trusted: boolean;
  reason: string;
}

export interface UsernameAiResult {
  allowed: boolean;
  reason: string;
}

async function callModerate<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("moderate", { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result as T;
}

export async function aiCheckUrl(url: string): Promise<UrlAiResult> {
  try {
    const r = await callModerate<Partial<UrlAiResult>>({ check: "url_safety", url });
    return {
      allowed: r.allowed ?? true,
      trusted: r.trusted ?? false,
      reason: r.reason ?? "",
    };
  } catch (e) {
    console.error("aiCheckUrl failed, allowing as unverified:", e);
    return { allowed: true, trusted: false, reason: "AI check unavailable" };
  }
}

export async function aiCheckUsername(username: string): Promise<UsernameAiResult> {
  try {
    const r = await callModerate<Partial<UsernameAiResult>>({ check: "username_check", username });
    return { allowed: r.allowed ?? true, reason: r.reason ?? "" };
  } catch (e) {
    console.error("aiCheckUsername failed, allowing:", e);
    return { allowed: true, reason: "AI check unavailable" };
  }
}
