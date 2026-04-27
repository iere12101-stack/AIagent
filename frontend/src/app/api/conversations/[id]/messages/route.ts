import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/authenticate";
import { toCamelCase } from "@/lib/helpers";
import { z } from "zod";

const createMessageSchema = z.object({
  direction: z.enum(["inbound", "outbound"]),
  senderType: z.enum(["ai", "human", "contact", "system"]).default("ai"),
  senderName: z.string().optional().nullable(),
  content: z.string().min(1),
  messageType: z.enum(["text", "image", "document", "location"]).default("text"),
  metadata: z.record(z.string(), z.unknown()).optional(),
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

    // Verify conversation belongs to org
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", id)
      .eq("org_id", auth.orgId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Fetch messages ordered by created_at asc
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: toCamelCase(data || []) });
  } catch (error) {
    console.error("GET /api/conversations/[id]/messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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
    const parsed = createMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify conversation belongs to org and get current unread_count
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .select("id, unread_count")
      .eq("id", id)
      .eq("org_id", auth.orgId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Create message
    const { data: message, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: id,
        direction: parsed.data.direction,
        sender_type: parsed.data.senderType ?? "ai",
        sender_name: parsed.data.senderName ?? null,
        content: parsed.data.content,
        message_type: parsed.data.messageType ?? "text",
        metadata: parsed.data.metadata
          ? JSON.stringify(parsed.data.metadata)
          : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update conversation: set last_message_at, increment unread_count for inbound
    const updateData: Record<string, unknown> = {
      last_message_at: new Date().toISOString(),
    };

    if (parsed.data.direction === "inbound") {
      updateData.unread_count = (conversation.unread_count || 0) + 1;
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      console.error(
        "Failed to update conversation after message:",
        updateError.message
      );
      // Still return the message — it was created successfully
    }

    return NextResponse.json({ data: toCamelCase(message) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/conversations/[id]/messages error:", error);
    return NextResponse.json(
      { error: "Failed to send message", details: String(error) },
      { status: 500 }
    );
  }
}
