import { createClient } from "@supabase/supabase-js";
export const maxDuration = 45;
const headers = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers });
const fields = {
  reply: { type: "string" },
  service: {
    type: "string",
    enum: [
      "Ocean Freight",
      "Air Freight",
      "Trucking",
      "Rail Freight",
      "Multimodal",
      "Warehousing",
    ],
  },
  origin: { type: "string" },
  destination: { type: "string" },
  cargo: { type: "string" },
  weight: { type: ["number", "null"] },
  volume: { type: ["number", "null"] },
  containers: { type: "string" },
  pickupAddress: { type: "string" },
  deliveryAddress: { type: "string" },
  packageCount: { type: ["number", "null"] },
  date: { type: "string" },
  requirements: { type: "string" },
};
export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY)
      return json(
        {
          error:
            "The AI assistant is not configured yet. Please use the structured inquiry form.",
        },
        503,
      );
    const auth = request.headers.get("authorization");
    if (!auth?.startsWith("Bearer "))
      return json({ error: "Sign in to use the inquiry assistant." }, 401);
    const db = createClient(
      process.env.SUPABASE_URL || "https://iacahumfwacpknggqjtd.supabase.co",
      process.env.SUPABASE_PUBLISHABLE_KEY ||
        "sb_publishable_zFpKvhZPkptRkV-9JQNn4A_yM-4-wM7",
      {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser(auth.slice(7));
    if (authError || !user)
      return json({ error: "Your session has expired. Sign in again." }, 401);
    const raw = await request.text();
    if (raw.length > 16000)
      return json({ error: "Please shorten the conversation." }, 413);
    const body = JSON.parse(raw) as {
      messages?: { role: string; content: string }[];
    };
    if (
      !Array.isArray(body.messages) ||
      !body.messages.length ||
      body.messages.length > 16 ||
      body.messages.some(
        (m) =>
          !["user", "assistant"].includes(m.role) ||
          typeof m.content !== "string" ||
          m.content.length > 3000,
      )
    )
      return json(
        { error: "Send between 1 and 16 short conversation messages." },
        400,
      );
    const { data: allowed, error: rateError } = await db.rpc(
      "claim_inquiry_assistant_request",
    );
    if (rateError)
      return json(
        {
          error:
            "The assistant database setup is incomplete. Please use the structured form.",
        },
        503,
      );
    if (!allowed)
      return json(
        {
          error:
            "You have reached the assistant limit of 10 requests per hour. Please use the structured form or try later.",
        },
        429,
      );
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      signal: AbortSignal.timeout(35000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        store: false,
        max_output_tokens: 1100,
        instructions: `You prepare freight inquiry drafts for CargoLink Africa. Today is ${new Date().toISOString().slice(0, 10)}. Extract only shipment facts stated by the user across this conversation. Ask for missing route, mode, cargo, gross weight in kg, volume and ready date. Ask for full pickup and delivery addresses for door-to-door service, sea equipment for ocean freight, or box/package count and gross weight for air freight. Air shipments do not use sea equipment. Customs clearance is not a standalone service; CFAs quote clearance fees within the freight charge breakdown. Never fabricate location codes, charges, providers, records or availability. Unknown strings must be empty and unknown numbers null. Use ISO YYYY-MM-DD for explicitly resolved dates. reply should briefly acknowledge details and ask the next relevant question. Never claim to submit, save or book anything. All output goes to a human-reviewed form.`,
        input: body.messages,
        text: {
          format: {
            type: "json_schema",
            name: "freight_inquiry",
            strict: true,
            schema: {
              type: "object",
              properties: fields,
              required: Object.keys(fields),
              additionalProperties: false,
            },
          },
        },
      }),
    });
    if (!response.ok)
      return json(
        {
          error:
            "The AI service is temporarily unavailable. Please try again or use the structured form.",
        },
        502,
      );
    const payload = (await response.json()) as {
      output?: { content?: { type: string; text?: string }[] }[];
    };
    const output = payload.output
      ?.flatMap((o) => o.content || [])
      .find((c) => c.type === "output_text")?.text;
    if (!output)
      return json(
        { error: "The assistant could not prepare a draft. Please try again." },
        502,
      );
    const parsed = JSON.parse(output) as Record<string, unknown>;
    if (
      typeof parsed.reply !== "string" ||
      typeof parsed.service !== "string" ||
      !fields.service.enum.includes(parsed.service) ||
      Object.keys(fields).some((k) => !(k in parsed))
    )
      return json(
        {
          error:
            "The assistant returned an incomplete draft. Please use the structured form.",
        },
        502,
      );
    return json(parsed);
  } catch (e) {
    if (e instanceof SyntaxError)
      return json({ error: "Invalid inquiry request." }, 400);
    return json(
      {
        error:
          "Unable to prepare your inquiry right now. Please use the structured form.",
      },
      502,
    );
  }
}
