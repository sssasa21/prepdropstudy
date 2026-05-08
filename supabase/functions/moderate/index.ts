// Moderation edge function — uses Lovable AI Gateway (Gemini 2.5 Flash).
// Checks: url_safety | username_check
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

type CheckType = "url_safety" | "username_check";

interface ModeratePayload {
  check: CheckType;
  url?: string;
  username?: string;
}

function promptFor(p: ModeratePayload): { system: string; user: string } {
  if (p.check === "url_safety") {
    return {
      system:
        "You are a URL moderation classifier for an educational exam-prep platform for students. Respond ONLY with the requested JSON.",
      user: `Is this URL safe and appropriate for an educational exam prep platform for students?
URL: ${p.url}

Check if it belongs to or redirects to any of these blocked categories:
- Adult/pornographic sites
- Gambling sites
- Illegal streaming or piracy sites
- Malware or phishing sites
- Drug or alcohol related sites
- Hate speech or extremist sites
- URL shorteners that hide destination (bit.ly, tinyurl, cutt.ly, rb.gy, shorturl.at, ow.ly, is.gd, buff.ly, t2m.io, shorte.st, adf.ly, linktr.ee used as shortener)
- Violent or gore content sites
- Fake news or misinformation sites
- Scam or fraud sites

Also check if it is from a trusted educational platform like:
play.google.com, apps.apple.com, t.me, youtube.com, unacademy.com, physicswallah.live, pw.live, vedantu.com, github.com, drive.google.com, toppr.com, byjus.com, Khan Academy, Doubtnut, etc.

Respond ONLY in this exact JSON format:
{"allowed": true/false, "trusted": true/false, "reason": "short reason"}`,
    };
  }
  return {
    system:
      "You are a username moderation classifier for a student educational platform. Respond ONLY with the requested JSON.",
    user: `Is this username clean and appropriate for a student educational platform?
Username: ${p.username}

Block it if it contains any offensive, abusive, sexual, violent, drug-related, or hateful words in ANY language including:
- English swear words and slurs
- Hindi gaaliyan (madarchod, bhosdike, chutiya, randi, loda, lavde, bhenchod, mc, bc, harami, kamina, kutte, suar, gaand, etc.)
- Leetspeak/number substitutions (pr0n, f4ck, sh1t, @ss, etc.)
- Urdu, Punjabi, Bengali, Tamil, Telugu offensive words
- Any language's slurs or hate speech

Respond ONLY in this exact JSON format:
{"allowed": true/false, "reason": "short reason"}`,
  };
}

function toolFor(check: CheckType) {
  if (check === "url_safety") {
    return [{
      type: "function",
      function: {
        name: "report",
        parameters: {
          type: "object",
          properties: {
            allowed: { type: "boolean" },
            trusted: { type: "boolean" },
            reason: { type: "string" },
          },
          required: ["allowed", "trusted", "reason"],
          additionalProperties: false,
        },
      },
    }];
  }
  return [{
    type: "function",
    function: {
      name: "report",
      parameters: {
        type: "object",
        properties: {
          allowed: { type: "boolean" },
          reason: { type: "string" },
        },
        required: ["allowed", "reason"],
        additionalProperties: false,
      },
    },
  }];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const payload = (await req.json()) as ModeratePayload;
    if (!payload?.check) {
      return new Response(JSON.stringify({ error: "Missing 'check'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { system, user } = promptFor(payload);

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: toolFor(payload.check),
        tool_choice: { type: "function", function: { name: "report" } },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      console.error("Gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
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
