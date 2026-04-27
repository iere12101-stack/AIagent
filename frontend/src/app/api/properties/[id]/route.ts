import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/authenticate";
import { toCamelCase, toSnakeCase } from "@/lib/helpers";
import { z } from "zod";

const updatePropertySchema = z.object({
  refNumber: z.string().min(1).optional(),
  transactionType: z.enum(["SALE", "RENT"]).optional(),
  category: z.string().min(1).optional(),
  bedrooms: z.string().optional().nullable(),
  bathrooms: z.string().optional().nullable(),
  sizeSqft: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  building: z.string().optional().nullable(),
  fullArea: z.string().optional().nullable(),
  priceAed: z.number().optional(),
  agentName: z.string().optional().nullable(),
  agentWhatsapp: z.string().optional().nullable(),
  available: z.boolean().optional(),
  permitNumber: z.string().optional().nullable(),
  portal: z.string().optional().nullable(),
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

    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("org_id", auth.orgId)
      .or(`id.eq.${id},ref_number.eq.${id}`)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({ data: toCamelCase(data) });
  } catch (error) {
    console.error("GET /api/properties/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch property", details: String(error) },
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
    const parsed = updatePropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify property exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from("properties")
      .select("id")
      .eq("org_id", auth.orgId)
      .or(`id.eq.${id},ref_number.eq.${id}`)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Map camelCase body to snake_case columns
    const snakeData = toSnakeCase(parsed.data as unknown as Record<string, unknown>);

    const { data, error } = await supabase
      .from("properties")
      .update(snakeData)
      .eq("id", existing.id)
      .eq("org_id", auth.orgId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: toCamelCase(data) });
  } catch (error) {
    console.error("PATCH /api/properties/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update property", details: String(error) },
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

    // Verify property exists and belongs to org
    const { data: existing, error: findError } = await supabase
      .from("properties")
      .select("id")
      .eq("org_id", auth.orgId)
      .or(`id.eq.${id},ref_number.eq.${id}`)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("properties")
      .delete()
      .eq("id", existing.id)
      .eq("org_id", auth.orgId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: { id, deleted: true } });
  } catch (error) {
    console.error("DELETE /api/properties/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete property", details: String(error) },
      { status: 500 }
    );
  }
}
