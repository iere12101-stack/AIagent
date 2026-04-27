import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { requireAuth } from "@/lib/authenticate";
import { toCamelCase } from "@/lib/helpers";
import { z } from "zod";

const createPropertySchema = z.object({
  refNumber: z.string().min(1),
  transactionType: z.enum(["SALE", "RENT"]),
  category: z.string().min(1),
  bedrooms: z.string().optional().nullable(),
  bathrooms: z.string().optional().nullable(),
  sizeSqft: z.number().optional().nullable(),
  status: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  building: z.string().optional().nullable(),
  fullArea: z.string().optional().nullable(),
  priceAed: z.number(),
  agentName: z.string().optional().nullable(),
  agentWhatsapp: z.string().optional().nullable(),
  available: z.boolean().default(true),
  permitNumber: z.string().optional().nullable(),
  portal: z.string().optional().nullable(),
  source: z.enum(["direct", "indirect"]).optional(),
  partnerAgency: z.string().optional().nullable(),
  partnerAgentName: z.string().optional().nullable(),
  partnerAgentPhone: z.string().optional().nullable(),
  partnerAgentEmail: z.string().optional().nullable(),
  coBrokerCommission: z.string().optional().nullable(),
  listingUrl: z.string().optional().nullable(),
});

function normalizePropertyType(category: string): "apartment" | "villa" | "townhouse" | "penthouse" {
  const normalized = category.trim().toLowerCase();
  if (normalized === "villa") return "villa";
  if (normalized === "townhouse") return "townhouse";
  if (normalized === "penthouse") return "penthouse";
  if (normalized === "studio") return "apartment";
  return "apartment";
}

function normalizePropertyStatus(status: string | null | undefined): "ready" | "off-plan" | null {
  if (!status) return null;
  const normalized = status.trim().toLowerCase();
  if (normalized === "ready") return "ready";
  if (normalized === "off plan" || normalized === "off-plan" || normalized === "offplan") return "off-plan";
  return null;
}

function normalizeLegacyCategory(transactionType: "SALE" | "RENT"): "sale" | "rent" {
  return transactionType === "SALE" ? "sale" : "rent";
}

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
    const source = searchParams.get("source") || undefined;
    const type = searchParams.get("type") || undefined;
    const area = searchParams.get("area") || undefined;
    const bedrooms = searchParams.get("bedrooms") || undefined;
    const minPrice = searchParams.get("minPrice")
      ? parseFloat(searchParams.get("minPrice")!)
      : undefined;
    const maxPrice = searchParams.get("maxPrice")
      ? parseFloat(searchParams.get("maxPrice")!)
      : undefined;
    const propertyStatus = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const available = searchParams.get("available");
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    const supabase = createServerClient();

    let query = supabase
      .from("properties")
      .select("*")
      .eq("org_id", auth.orgId);

    if (search) {
      query = query.or(
        `ref_number.ilike.%${search}%,building.ilike.%${search}%,full_area.ilike.%${search}%,district.ilike.%${search}%`
      );
    }
    if (source === "direct" || source === "indirect") {
      query = query.eq("source", source);
    }
    if (type) query = query.eq("transaction_type", type);
    if (bedrooms) query = query.eq("bedrooms", bedrooms);
    if (minPrice !== undefined) query = query.gte("price_aed", minPrice);
    if (maxPrice !== undefined) query = query.lte("price_aed", maxPrice);
    if (propertyStatus) query = query.eq("status", propertyStatus);
    if (category) query = query.eq("category", category);
    if (available !== null && available !== undefined && available !== "") {
      query = query.eq("available", available === "true");
    }
    if (area) {
      query = query.or(
        `district.ilike.%${area}%,full_area.ilike.%${area}%`
      );
    }
    if (cursor) query = query.lt("created_at", cursor);

    query = query.order("created_at", { ascending: false }).limit(limit + 1);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Count query with same filters
    let countQuery = supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("org_id", auth.orgId);

    if (search) {
      countQuery = countQuery.or(
        `ref_number.ilike.%${search}%,building.ilike.%${search}%,full_area.ilike.%${search}%,district.ilike.%${search}%`
      );
    }
    if (source === "direct" || source === "indirect") {
      countQuery = countQuery.eq("source", source);
    }
    if (type) countQuery = countQuery.eq("transaction_type", type);
    if (bedrooms) countQuery = countQuery.eq("bedrooms", bedrooms);
    if (minPrice !== undefined) countQuery = countQuery.gte("price_aed", minPrice);
    if (maxPrice !== undefined) countQuery = countQuery.lte("price_aed", maxPrice);
    if (propertyStatus) countQuery = countQuery.eq("status", propertyStatus);
    if (category) countQuery = countQuery.eq("category", category);
    if (available !== null && available !== undefined && available !== "") {
      countQuery = countQuery.eq("available", available === "true");
    }

    const { count: total } = await countQuery;

    let nextCursor: string | null = null;
    const rows = data || [];
    if (rows.length > limit) {
      rows.pop();
      nextCursor = rows[rows.length - 1].created_at ?? null;
    }

    return NextResponse.json({
      data: toCamelCase(rows),
      nextCursor,
      total: total || 0,
    });
  } catch (error) {
    console.error("GET /api/properties error:", error);
    return NextResponse.json(
      { error: "Failed to fetch properties", details: String(error) },
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
    const parsed = createPropertySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const refNumber = parsed.data.refNumber.trim().toUpperCase();
    const normalizedTransactionType = parsed.data.transactionType;
    const normalizedType = normalizePropertyType(parsed.data.category);
    const normalizedStatus = normalizePropertyStatus(parsed.data.status);
    const normalizedCategory = normalizeLegacyCategory(normalizedTransactionType);
    const source = parsed.data.source === "indirect" ? "indirect" : "direct";

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("properties")
      .insert({
        org_id: auth.orgId,
        ref: refNumber,
        ref_number: refNumber,
        type: normalizedType,
        transaction_type: normalizedTransactionType,
        category: normalizedCategory,
        bedrooms: parsed.data.bedrooms ?? null,
        bathrooms: parsed.data.bathrooms ?? null,
        size_sqft: parsed.data.sizeSqft ?? null,
        status: normalizedStatus,
        district: parsed.data.district ?? null,
        building: parsed.data.building ?? null,
        full_area: parsed.data.fullArea ?? parsed.data.district ?? null,
        price_aed: parsed.data.priceAed,
        agent_name: parsed.data.agentName ?? null,
        agent_whatsapp: parsed.data.agentWhatsapp ?? null,
        available: parsed.data.available ?? true,
        permit_number: parsed.data.permitNumber ?? null,
        portal: parsed.data.portal ?? null,
        source,
        partner_agency: source === "indirect" ? parsed.data.partnerAgency ?? null : null,
        partner_agent_name: source === "indirect" ? parsed.data.partnerAgentName ?? null : null,
        partner_agent_phone: source === "indirect" ? parsed.data.partnerAgentPhone ?? null : null,
        partner_agent_email: source === "indirect" ? parsed.data.partnerAgentEmail ?? null : null,
        co_broker_commission: source === "indirect" ? parsed.data.coBrokerCommission ?? null : null,
        listing_url: source === "indirect" ? parsed.data.listingUrl ?? null : null,
      })
      .select()
      .single();

    if (error) {
      const isDuplicateRef = error.code === "23505";
      return NextResponse.json(
        { error: error.message, code: isDuplicateRef ? "DUPLICATE_REF" : "DB_INSERT_FAILED" },
        { status: isDuplicateRef ? 409 : 500 },
      );
    }

    return NextResponse.json({ data: toCamelCase(data) }, { status: 201 });
  } catch (error) {
    console.error("POST /api/properties error:", error);
    return NextResponse.json(
      { error: "Failed to create property", details: String(error) },
      { status: 500 }
    );
  }
}
