/**
 * COMPANY INTENT HANDLER
 * 
 * Returns static company information.
 * NEVER calls AI. NEVER generates data.
 * 
 * Examples:
 * - "Send me office address" → company address
 * - "What is your phone?" → company phone
 * - "Where are you located?" → full company info
 */

import { COMPANY, TEAM } from '../../../config/companyData.js'

export interface CompanyResponse {
  type: 'company'
  language: 'en' | 'ar'
  content: string
  metadata: {
    address: string
    phone: string
    email: string
    website: string
  }
}

export function buildCompanyResponse(language: 'en' | 'ar'): CompanyResponse {
  const content =
    language === 'ar'
      ? buildArabicCompanyResponse()
      : buildEnglishCompanyResponse()

  return {
    type: 'company',
    language,
    content,
    metadata: {
      address: COMPANY.address,
      phone: COMPANY.phone,
      email: COMPANY.email,
      website: COMPANY.website,
    },
  }
}

function buildEnglishCompanyResponse(): string {
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

function buildArabicCompanyResponse(): string {
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

/**
 * Get company response as string
 */
export function getCompanyInfoAsString(language: 'en' | 'ar'): string {
  const response = buildCompanyResponse(language)
  const content = response.content?.trim()
  if (content) return content

  if (language === 'ar') {
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

export function buildSpecificCompanyResponse(message: string, language: 'en' | 'ar'): string | null {
  const lower = message.toLowerCase()
  const ceo = TEAM.find((member) => member.id === 'imran')
  const ownerName = ceo?.name ?? COMPANY.owner
  const wantsOwner = /\b(owner|ceo|founder)\b/i.test(lower)
  const wantsWebsite = /\b(website|site|url|web address)\b/i.test(lower)
  const wantsAddress = /\b(address|location|office|current locations?)\b/i.test(lower)
  const wantsPhone = /\b(phone|number|contact number|company number)\b/i.test(lower)
  const wantsEmail = /\b(email|mail)\b/i.test(lower)
  const wantsHours = /\b(hours|timing|opening|open)\b/i.test(lower)

  if (!wantsOwner && !wantsWebsite && !wantsAddress && !wantsPhone && !wantsEmail && !wantsHours) {
    return null
  }

  if (wantsOwner && !wantsWebsite && !wantsAddress && !wantsPhone && !wantsEmail && !wantsHours) {
    return language === 'ar'
      ? `المالك هو *${ownerName}*، وهو أيضاً الرئيس التنفيذي للشركة.`
      : `The owner is *${ownerName}*, who is also the CEO of the company.`
  }

  const lines: string[] = []
  if (wantsOwner) lines.push(language === 'ar' ? `👤 *المالك:* ${ownerName}` : `👤 *Owner:* ${ownerName}`)
  if (wantsWebsite) lines.push(language === 'ar' ? `🌐 *الموقع الإلكتروني:* ${COMPANY.website}` : `🌐 *Website:* ${COMPANY.website}`)
  if (wantsAddress) lines.push(language === 'ar' ? `📍 *العنوان:* ${COMPANY.address}` : `📍 *Address:* ${COMPANY.address}`)
  if (wantsPhone) lines.push(language === 'ar' ? `📞 *الهاتف:* ${COMPANY.phone}` : `📞 *Phone:* ${COMPANY.phone}`)
  if (wantsEmail) lines.push(language === 'ar' ? `📧 *البريد الإلكتروني:* ${COMPANY.email}` : `📧 *Email:* ${COMPANY.email}`)
  if (wantsHours) lines.push(language === 'ar' ? `⏰ *ساعات العمل:* ${COMPANY.hours}` : `⏰ *Hours:* ${COMPANY.hours}`)

  return lines.join('\n')
}
