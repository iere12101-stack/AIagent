import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/authenticate";
import { toCamelCase } from "@/lib/helpers";
import { z } from "zod";

const createContactSchema = z.object({
  phone: z.string().min(1),
  name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  pushName: z.string().optional().nullable(),
  leadScore: z.number().min(0).max(100).default(0),
  leadStatus: z.enum(["new", "cold", "warm", "hot", "converted", "lost"]).default("new"),
  language: z.enum(["en", "ar"]).default("en"),
  intent: z.enum(["buy", "rent", "invest", "browse"]).optional().nullable(),
  areaInterest: z.string().optional().nullable(),
  bedrooms: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  timeline: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  handledBy: z.enum(["ai", "human"]).optional().nullable(),
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
    const search = searchParams.get("search") || undefined;
    const leadStatus = searchParams.get("leadStatus") || undefined;
    const intent = searchParams.get("intent") || undefined;
    const assignedTo = searchParams.get("assignedTo") || undefined;
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const supabase = createServerClient();

    let query = supabase
      .from("contacts")
      .select("*")
      .eq("org_id", auth.orgId);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,push_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    if (leadStatus) query = query.eq("lead_status", leadStatus);
    if (intent) query = query.eq("intent", intent);
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    if (cursor) query = query.gt("id", cursor);

    query = query.order("id", { ascending: true }).limit(limit + 1);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Count query with same filters
    let countQuery = supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId);

    if (search) {
      countQuery = countQuery.or(
        `name.ilike.%${search}%,phone.ilike.%${search}%,push_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    if (leadStatus) countQuery = countQuery.eq("lead_status", leadStatus);
    if (intent) countQuery = countQuery.eq("intent", intent);
    if (assignedTo) countQuery = countQuery.eq("assigned_to", assignedTo);

    const { count: total } = await countQuery;

    let nextCursor: string | null = null;
    const rows = data || [];
    if (rows.length > limit) {
      rows.pop();
      nextCursor = rows[rows.length - 1].id;
    }

    // Enrich each contact with conversation count
    const enrichedRows = await Promise.all(
      rows.map(async (c) => {
        const { count: convCount } = await supabase
          .from("conversations")
          .select("*", { count: "exact", head: true })
          .eq("contact_id", c.id);

        return {
          ...c,
          conversationCount: convCount || 0,
        };
      })
    );

    return NextResponse.json({
      data: toCamelCase(enrichedRows),
      nextCursor,
      total: total || 0,
    });
  } catch (error) {
    console.error("GET /api/contacts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts", details: String(error) },
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
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        org_id: auth.orgId,
        phone: parsed.data.phone,
        name: parsed.data.name ?? null,
        email: parsed.data.email ?? null,
        push_name: parsed.data.pushName ?? null,
        lead_score: parsed.data.leadScore ?? 0,
        lead_status: parsed.data.leadStatus ?? "new",
        language: parsed.data.language ?? "en",
        intent: parsed.data.intent ?? null,
        area_interest: parsed.data.areaInterest ?? null,
        bedrooms: parsed.data.bedrooms ?? null,
        budget: parsed.data.budget ?? null,
        timeline: parsed.data.timeline ?? null,
        notes: parsed.data.notes ?? null,
        assigned_to: parsed.data.assignedTo ?? null,
        handled_by: parsed.data.handledBy ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: toCamelCase(data) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/contacts error:", error);
    return NextResponse.json(
      { error: "Failed to create contact", details: String(error) },
      { status: 500 }
    );
  }
}
