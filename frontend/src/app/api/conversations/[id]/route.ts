import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/authenticate";
import { toCamelCase, toSnakeCase } from "@/lib/helpers";
import { z } from "zod";

const updateConversationSchema = z.object({
  status: z.enum(["active", "resolved", "archived"]).optional(),
  handledBy: z.enum(["ai", "human"]).optional(),
  assignedTo: z.string().optional().nullable(),
  leadScore: z.number().min(0).max(100).optional(),
  detectedIntent: z.string().optional().nullable(),
  detectedLang: z.string().optional(),
  unreadCount: z.number().min(0).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  let auth;
  try {
    auth = await requireAuth(_request);
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  try {
    const { id } = await context.params;
    const supabase = createServerClient();

    // Fetch conversation with org guard
    const { data: conversation, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", id)
      .eq("org_id", auth.orgId)
      .single();

    if (error || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Fetch contact
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, name, phone, push_name, lead_score, lead_status, intent")
      .eq("id", conversation.contact_id)
      .single();

    // Fetch device
    const { data: device } = conversation.device_id
      ? await supabase
          .from("devices")
          .select("id, name, status")
          .eq("id", conversation.device_id)
          .single()
      : { data: null };

    // Fetch messages ordered by created_at asc
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (msgError) {
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }

    const result = {
      ...conversation,
      contact: contact || null,
      device: device || null,
      messages: messages || [],
    };

    return NextResponse.json({ data: toCamelCase(result) });
  } catch (error) {
    console.error("GET /api/conversations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  let auth;
  try {
    auth = await requireAuth(request);
  } catch (err) {
    if (err instanceof NextResponse) return err as NextResponse;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateConversationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify conversation exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("org_id", auth.orgId)
      .single();

    if (findError || !existing) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Map camelCase body to snake_case columns
    const snakeData = toSnakeCase(parsed.data as unknown as Record<string, unknown>);

    // If status is being resolved, stamp last_message_at
    if (parsed.data.status === "resolved") {
      (snakeData as Record<string, unknown>).last_message_at =
        new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("conversations")
      .update(snakeData)
      .eq("id", id)
      .eq("org_id", auth.orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: toCamelCase(data) });
  } catch (error) {
    console.error("PATCH /api/conversations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update conversation", details: String(error) },
      { status: 500 }
    );
  }
}
