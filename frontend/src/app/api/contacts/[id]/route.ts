import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/authenticate";
import { toCamelCase, toSnakeCase } from "@/lib/helpers";
import { z } from "zod";

const updateContactSchema = z.object({
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  pushName: z.string().optional().nullable(),
  leadScore: z.number().min(0).max(100).optional(),
  leadStatus: z.enum(["new", "cold", "warm", "hot", "converted", "lost"]).optional(),
  language: z.enum(["en", "ar"]).optional(),
  intent: z.enum(["buy", "rent", "invest", "browse"]).optional().nullable(),
  areaInterest: z.string().optional().nullable(),
  bedrooms: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  timeline: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  handledBy: z.enum(["ai", "human"]).optional().nullable(),
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

    // Fetch contact
    const { data: contact, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", id)
      .eq("org_id", auth.orgId)
      .single();

    if (error || !contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const contactMemory =
      contact.contact_memory && typeof contact.contact_memory === "object"
        ? (contact.contact_memory as Record<string, unknown>)
        : {};
    const memory = Object.entries(contactMemory).map(([key, value]) => ({
      id: `${id}-${key}`,
      contact_id: id,
      key,
      value,
      updated_at: contact.updated_at ?? contact.created_at ?? new Date().toISOString(),
    }));

    // Fetch conversation count
    const { count: conversationCount } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("contact_id", id);

    const result = {
      ...contact,
      memory,
      conversationCount: conversationCount || 0,
    };

    return NextResponse.json({ data: toCamelCase(result) });
  } catch (error) {
    console.error("GET /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact", details: String(error) },
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
    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify contact exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", id)
      .eq("org_id", auth.orgId)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Map camelCase body to snake_case columns
    const snakeData = toSnakeCase(parsed.data as unknown as Record<string, unknown>);

    const { data, error } = await supabase
      .from("contacts")
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
    console.error("PATCH /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update contact", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
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

    // Verify contact exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from("contacts")
      .select("id")
      .eq("id", id)
      .eq("org_id", auth.orgId)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", id)
      .eq("org_id", auth.orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("DELETE /api/contacts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete contact", details: String(error) },
      { status: 500 }
    );
  }
}
