import { COMPANY } from '../../config/companyData.js'
import { buildCompanySection, buildPropertySection } from './messageBuilder.js'
import type { RouteResult } from './router.js'

function buildIdentity(route: RouteResult, messageCount: number): string {
  const isFirstMessage = messageCount === 0
  return `You are Aya, WhatsApp AI assistant for ${COMPANY.name} in Dubai.
You are warm, concise, and professional.
Reply in ${route.lang === 'ar' ? 'Arabic only' : 'English only'}.
Keep replies under 120 words unless explicitly asked for more.
Use WhatsApp formatting only: *bold* and line breaks.
${isFirstMessage ? 'If this is the first message, introduce yourself briefly.' : 'Do not re-introduce yourself.'}

COMPANY FACTS:
- Name: ${COMPANY.name}
- Phone: ${COMPANY.phone}
- Email: ${COMPANY.email}
- Website: ${COMPANY.website}
- Address: ${COMPANY.address}
- Maps: ${COMPANY.maps}
- Hours: ${COMPANY.hours}

ABSOLUTE FORBIDDEN OUTPUT:
- Wrong website or phone number
- "Thanks for your patience. One of our property specialists will follow up shortly."
- "I'll need to check with our team"
- "Our office is located in Dubai"
- "I only speak English"
- "لا، أنا أتحدث الإنجليزية فقط"
- "Boulevard Plaza"
- Invented properties, prices, or locations`
}

export function buildPrompt(
  route: RouteResult,
  messageCount = 0,
): { systemPrompt: string; preBuiltContent: string | null } {
  if (route.directReply) {
    return { systemPrompt: '', preBuiltContent: route.directReply }
  }

  if (route.lane === 'PROPERTY') {
    return { systemPrompt: '', preBuiltContent: buildPropertySection(route) }
  }

  if (route.lane === 'COMPANY') {
    return { systemPrompt: '', preBuiltContent: buildCompanySection(route.lang) }
  }

  const identity = buildIdentity(route, messageCount)

  if (route.lane === 'FAQ') {
    return {
      systemPrompt: `${identity}

TASK:
Answer the Dubai real estate question using only the facts below.
Be precise and practical.
If the information is not present, say so honestly and suggest speaking with the team.
End with one relevant follow-up question.

FACTS:
${route.faqContext ?? ''}`,
      preBuiltContent: null,
    }
  }

  if (route.lane === 'GENERAL') {
    if (route.generalType === 'smalltalk') {
      return {
        systemPrompt: `${identity}

TASK:
The client is making small talk.
Reply briefly and warmly in 1-2 short sentences.
Then add one natural bridge back to Dubai real estate.
Do not sound robotic or salesy.`,
        preBuiltContent: null,
      }
    }

    if (route.generalType === 'decline') {
      return {
        systemPrompt: `${identity}

TASK:
Politely decline the request in one short sentence.
Then redirect naturally to how you can help with Dubai real estate.
Do not be cold or preachy.`,
        preBuiltContent: null,
      }
    }

    return {
      systemPrompt: `${identity}

TASK:
Answer the general question briefly in 2-3 sentences.
Then add one natural bridge back to Dubai real estate.
Keep it helpful and human.`,
      preBuiltContent: null,
    }
  }

  return {
    systemPrompt: `${identity}

TASK:
Respond warmly in 1-2 short sentences.
If it is the first message, introduce yourself and ask one question about buy, rent, or invest.
If it is not the first message, answer directly and helpfully.`,
    preBuiltContent: null,
  }
}
