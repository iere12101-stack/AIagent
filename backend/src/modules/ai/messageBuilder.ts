import { COMPANY } from '../../config/companyData.js'
import type { RouteResult } from './router.js'

function clean(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  const text = String(value).trim()
  if (text === '') return fallback
  if (/team-verified|placeholder|\[.*?\]|\{[A-Z_]+\}/i.test(text)) return fallback
  return text
}

function formatPropertyCard(property: Record<string, unknown>, lang: 'en' | 'ar'): string {
  const price = property.price_aed
    ? `AED ${Number(property.price_aed).toLocaleString('en-AE')}`
    : (lang === 'ar' ? 'السعر عند الطلب' : 'Price on request')
  const transactionType = property.transaction_type === 'RENT'
    ? (lang === 'ar' ? 'للإيجار' : 'For Rent')
    : (lang === 'ar' ? 'للبيع' : 'For Sale')
  const beds = clean(property.bedrooms, lang === 'ar' ? 'استوديو' : 'Studio')
  const area = clean(property.district, lang === 'ar' ? 'دبي' : 'Dubai')
  const building = clean(property.building)
  const category = clean(property.category, lang === 'ar' ? 'شقة' : 'Apartment')
  const ref = clean(property.ref_number)
  const agent = clean(property.agent_name, 'IERE Team')
  const sqft = property.size_sqft ? Number(property.size_sqft).toLocaleString('en-AE') : null
  const status = clean(property.status)

  if (lang === 'ar') {
    return [
      '━━━━━━━━━━━━━━━━━━━━━━',
      `🏠 *${category} — ${area}*`,
      building ? `📍 ${building}، ${area}` : `📍 ${area}`,
      `🛏 *${beds}${beds !== 'استوديو' ? ' غرف' : ''}*${property.bathrooms ? ` | 🚿 ${clean(property.bathrooms)} حمامات` : ''}`,
      sqft ? `📐 ${sqft} قدم²` : null,
      `💰 *${price}* (${transactionType})`,
      status ? `📋 ${status}` : null,
      ref ? `🏷 Ref: ${ref}` : null,
      `👤 ${agent}`,
      '━━━━━━━━━━━━━━━━━━━━━━',
    ].filter(Boolean).join('\n')
  }

  return [
    '━━━━━━━━━━━━━━━━━━━━━━',
    `🏠 *${category} — ${area}*`,
    building ? `📍 ${building}, ${area}, Dubai` : `📍 ${area}, Dubai`,
    `🛏 *${beds === 'Studio' ? 'Studio' : `${beds} Beds`}*${property.bathrooms ? ` | 🚿 ${clean(property.bathrooms)} Baths` : ''}`,
    sqft ? `📐 ${sqft} sqft` : null,
    `💰 *${price}* (${transactionType})`,
    status ? `📋 Status: ${status}` : null,
    ref ? `🏷 Ref: ${ref}` : null,
    `👤 Agent: ${agent}`,
    '━━━━━━━━━━━━━━━━━━━━━━',
  ].filter(Boolean).join('\n')
}

export function buildPropertySection(route: RouteResult): string | null {
  if (route.lane !== 'PROPERTY') return null

  if (route.noResultReason === 'no_listings_in_area') {
    const area = route.intent.area ?? 'that area'
    if (route.lang === 'ar') {
      return `عذراً، لا تتوفر لدينا قوائم عقارية في *${area}* حالياً 🙏\n\nإذا رغبت، يمكنني عرض بدائل قريبة أو إعادة البحث بمنطقة أخرى.`
    }
    return `We don't currently have listings in *${area}* 🙏\n\nIf you'd like, I can show nearby alternatives or search another area for you.`
  }

  if (route.noResultReason === 'filtered_out' || route.noResultReason === 'no_listings_match') {
    if (route.lang === 'ar') {
      return `لم أجد تطابقاً دقيقاً بهذه الشروط حالياً 🙏\n\nيمكنني توسيع البحث بمنطقة أو ميزانية مختلفة، أو عرض بدائل قريبة.`
    }
    return `I couldn't find an exact match with those filters right now 🙏\n\nI can broaden the search with a different area or budget, or show nearby alternatives.`
  }

  if (route.noResultReason === 'db_error') {
    if (route.lang === 'ar') {
      return 'حدثت مشكلة مؤقتة أثناء البحث في قاعدة البيانات. يمكنني إعادة المحاولة أو توصيلك بفريقنا مباشرة.'
    }
    return 'There was a brief issue while checking the database. I can try again or connect you directly with our team.'
  }

  if (!route.properties || route.properties.length === 0) return null

  const cards = route.properties.map((property) => formatPropertyCard(property, route.lang)).join('\n\n')
  const cta = route.lang === 'ar'
    ? '\n\nهل تريد حجز معاينة أو مشاهدة المزيد من الخيارات؟'
    : '\n\nWould you like to arrange a viewing or see more options?'
  return `${cards}${cta}`
}

export function buildCompanySection(lang: 'en' | 'ar'): string {
  if (lang === 'ar') {
    return [
      `🏢 *${COMPANY.name}*`,
      '',
      `📍 *العنوان:* ${COMPANY.address}`,
      `📞 *الهاتف:* ${COMPANY.phone}`,
      `📧 *البريد الإلكتروني:* ${COMPANY.email}`,
      `🌐 *الموقع الإلكتروني:* ${COMPANY.website}`,
      `🗺 *خرائط Google:* ${COMPANY.maps}`,
      `⏰ *ساعات العمل:* ${COMPANY.hours}`,
    ].join('\n')
  }

  return [
    `🏢 *${COMPANY.name}*`,
    '',
    `📍 *Address:* ${COMPANY.address}`,
    `📞 *Phone:* ${COMPANY.phone}`,
    `📧 *Email:* ${COMPANY.email}`,
    `🌐 *Website:* ${COMPANY.website}`,
    `🗺 *Google Maps:* ${COMPANY.maps}`,
    `⏰ *Hours:* ${COMPANY.hours}`,
  ].join('\n')
}
