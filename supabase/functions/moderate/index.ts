// Moderation edge function — uses Lovable AI Gateway (Gemini) for all checks.
// Checks: url_safety | name_check | spam | duplicate
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

type CheckType = "url_safety" | "name_check" | "spam" | "duplicate";

interface ModeratePayload {
  check: CheckType;
  url?: string;
  name?: string;
  text?: string;
  candidate?: { name: string; url: string };
  existing?: Array<{ name: string; url: string }>;
}

function systemFor(check: CheckType): string {
  switch (check) {
    case "url_safety":
      return `You are a URL safety classifier for an exam-prep resource site for students.
Only flag URLs that are DIRECTLY HARMFUL to the viewer: malware, phishing, scams,
explicit adult/sexual content, or content promoting violence or self-harm.
DO NOT flag based on piracy, copyright, or unofficial distribution. Study materials,
books, courses, PDFs, notes, and educational resources are ALWAYS SAFE regardless of
copyright status. Educational, app store, Telegram, YouTube, and coaching sites are SAFE.`;
    case "name_check":
      return `You are a strict resource-name classifier for an exam-prep site used by school/college students. 
Reject names that contain profanity, slurs, sexual content, drug references, hate speech, 
or any creative spelling/leetspeak bypasses (e.g. "f4ck", "pr0n", "sh1t"). 
Names referring to legitimate study material, apps, or subjects are OK.`;
    case "spam":
      return `You are a spam detector for an exam-prep resource submission site. 
Flag entries that are: gibberish, advertising unrelated products, clickbait, scams, 
crypto/forex pumps, or anything that is NOT a genuine study resource for students.`;
    case "duplicate":
      return `You detect duplicate submissions on an exam-prep resource site. 
A submission is a duplicate if it points to the same resource as an existing one — 
either the URL is the same/equivalent, or the name clearly refers to the same resource.`;
  }
}

function userFor(p: ModeratePayload): string {
  switch (p.check) {
    case "url_safety":
      return `URL to evaluate: ${p.url}\nReturn JSON: {"safe": boolean, "reason": string}`;
    case "name_check":
      return `Resource name to evaluate: "${p.name}"\nReturn JSON: {"clean": boolean, "reason": string}`;
    case "spam":
      return `Resource name: "${p.name}"\nResource URL: ${p.url}\nReturn JSON: {"spam": boolean, "reason": string}`;
    case "duplicate": {
      const list = (p.existing ?? [])
        .map((e, i) => `${i + 1}. name="${e.name}" url=${e.url}`)
        .join("\n");
      return `Candidate: name="${p.candidate?.name}" url=${p.candidate?.url}
Existing resources:
${list || "(none)"}
Return JSON: {"duplicate": boolean, "matchIndex": number|null, "reason": string}`;
    }
  }
}

function toolFor(check: CheckType) {
  const props: Record<CheckType, any> = {
    url_safety: {
      type: "object",
      properties: {
        safe: { type: "boolean" },
        reason: { type: "string" },
      },
      required: ["safe", "reason"],
      additionalProperties: false,
    },
    name_check: {
      type: "object",
      properties: {
        clean: { type: "boolean" },
        reason: { type: "string" },
      },
      required: ["clean", "reason"],
      additionalProperties: false,
    },
    spam: {
      type: "object",
      properties: {
        spam: { type: "boolean" },
        reason: { type: "string" },
      },
      required: ["spam", "reason"],
      additionalProperties: false,
    },
    duplicate: {
      type: "object",
      properties: {
        duplicate: { type: "boolean" },
        matchIndex: { type: ["number", "null"] },
        reason: { type: "string" },
      },
      required: ["duplicate", "matchIndex", "reason"],
      additionalProperties: false,
    },
  };
  return [
    {
      type: "function",
      function: {
        name: "report",
        description: "Return the moderation verdict.",
        parameters: props[check],
      },
    },
  ];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const payload = (await req.json()) as ModeratePayload;
    if (!payload?.check) {
      return new Response(JSON.stringify({ error: "Missing 'check'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = {
      model: MODEL,
      messages: [
        { role: "system", content: systemFor(payload.check) },
        { role: "user", content: userFor(payload) },
      ],
      tools: toolFor(payload.check),
      tool_choice: { type: "function", function: { name: "report" } },
    };

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await resp.text();
      console.error("Gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const args =
      data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let result: any = {};
    if (args) {
      try { result = JSON.parse(args); } catch { result = {}; }
    }

    return new Response(JSON.stringify({ check: payload.check, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
