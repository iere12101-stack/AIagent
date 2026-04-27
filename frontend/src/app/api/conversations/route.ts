import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/authenticate";
import { toCamelCase } from "@/lib/helpers";
import { z } from "zod";

const createConversationSchema = z.object({
  contactId: z.string().min(1),
  deviceId: z.string().optional().nullable(),
  status: z.enum(["active", "resolved", "archived"]).default("active"),
  handledBy: z.enum(["ai", "human"]).default("ai"),
  assignedTo: z.string().optional().nullable(),
  leadScore: z.number().min(0).max(100).default(0),
  detectedIntent: z.string().optional().nullable(),
  detectedLang: z.string().default("en"),
});

export async function GET(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") || undefined;
    const handledBy = searchParams.get("handledBy") || undefined;
    const contactId = searchParams.get("contactId") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const supabase = createServerClient();

    let query = supabase
      .from("conversations")
      .select("*")
      .eq("org_id", auth.orgId);

    if (status) query = query.eq("status", status);
    if (handledBy) query = query.eq("handled_by", handledBy);
    if (contactId) query = query.eq("contact_id", contactId);
    if (cursor) query = query.lt("last_message_at", cursor);

    query = query
      .order("last_message_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Count query with same filters
    let countQuery = supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId);

    if (status) countQuery = countQuery.eq("status", status);
    if (handledBy) countQuery = countQuery.eq("handled_by", handledBy);
    if (contactId) countQuery = countQuery.eq("contact_id", contactId);

    const { count: total } = await countQuery;

    let nextCursor: string | null = null;
    const rows = data || [];
    if (rows.length > limit) {
      rows.pop();
      nextCursor = rows[rows.length - 1].last_message_at || null;
    }

    // Enrich each conversation with contact info and last message
    const enrichedRows = await Promise.all(
      rows.map(async (c) => {
        // Fetch contact
        const { data: contact } = await supabase
          .from("contacts")
          .select("id, name, phone, push_name, lead_score, lead_status, intent")
          .eq("id", c.contact_id)
          .single();

        // Fetch last message (most recent by created_at)
        const { data: lastMessages } = await supabase
          .from("messages")
          .select("content, created_at, direction, sender_type, status")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);

        return {
          ...c,
          contact: contact || null,
          lastMessagePreview:
            lastMessages && lastMessages.length > 0
              ? lastMessages[0].content
              : null,
          lastMessageSenderType:
            lastMessages && lastMessages.length > 0
              ? lastMessages[0].sender_type
              : null,
          lastMessageStatus:
            lastMessages && lastMessages.length > 0
              ? lastMessages[0].status
              : null,
        };
      })
    );

    return NextResponse.json({
      data: toCamelCase(enrichedRows),
      nextCursor,
      total: total || 0,
    });
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const parsed = createConversationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        org_id: auth.orgId,
        contact_id: parsed.data.contactId,
        device_id: parsed.data.deviceId ?? null,
        status: parsed.data.status ?? "active",
        handled_by: parsed.data.handledBy ?? "ai",
        assigned_to: parsed.data.assignedTo ?? null,
        lead_score: parsed.data.leadScore ?? 0,
        detected_intent: parsed.data.detectedIntent ?? null,
        detected_lang: parsed.data.detectedLang ?? "en",
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch contact for the response
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, name, phone, push_name")
      .eq("id", parsed.data.contactId)
      .single();

    const result = {
      ...data,
      contact: contact || null,
    };

    return NextResponse.json({ data: toCamelCase(result) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/conversations error:", error);
    return NextResponse.json(
      { error: "Failed to create conversation", details: String(error) },
      { status: 500 }
    );
  }
}
