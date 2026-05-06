import { supabase } from "@/integrations/supabase/client";

export interface UrlSafetyResult { safe: boolean; reason: string }

async function callModerate<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("moderate", { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.result as T;
}

export const aiCheckUrl = (url: string) =>
  callModerate<UrlSafetyResult>({ check: "url_safety", url });

export interface FullModerationReport {
  url: UrlSafetyResult;
}

export async function runFullModeration(_name: string, url: string): Promise<FullModerationReport> {
  const u = await aiCheckUrl(url);
  return { url: u };
}
