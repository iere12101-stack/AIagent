/**
 * INTENT-BASED ROUTING
 * 
 * This is the main routing layer that:
 * 1. Detects user intent (company, agent, property, faq, general)
 * 2. Routes to appropriate handler (no AI)
 * 3. Only calls AI for formatting/general responses
 * 
 * Flow:
 * Message → detectPrimaryIntent() → route to handler
 *
 * company → companyHandler (return static data)
 * agent → agentHandler (return agent contact)
 * property → propertyHandler (query DB, pass results to AI)
 * faq → router.ts (existing FAQ handler)
 * general → router.ts (existing general handler)
 */

import { detectPrimaryIntent, extractPropertyDetails } from './intentDetector.js'
import {
  getCompanyInfoAsString,
} from './handlers/companyHandler.js'
import {
  getAgentResponse,
  getAgentByName,
  type AgentResponse,
} from './handlers/agentHandler.js'
import { queryProperties, type PropertyHandlerResponse } from './handlers/propertyHandler.js'

export interface RoutedMessageRequest {
  orgId: string
  message: string
  phoneNumber: string
  memory: Record<string, unknown>
}

export interface DirectResponse {
  type: 'direct'
  content: string
  language: 'en' | 'ar'
  metadata?: Record<string, unknown>
}

export interface QueryResponse {
  type: 'query'
  data: PropertyHandlerResponse
  language: 'en' | 'ar'
}

export interface DeferToAIResponse {
  type: 'defer_to_ai'
  language: 'en' | 'ar'
  data?: unknown
}

export type RoutingResult = DirectResponse | QueryResponse | DeferToAIResponse

/**
 * Main routing function
 * Detects intent and routes to appropriate handler
 */
export async function routeByIntent(request: RoutedMessageRequest): Promise<RoutingResult> {
  const { orgId, message, phoneNumber, memory } = request

  // Step 1: Detect intent using strict rules
  const detection = detectPrimaryIntent(message)
  const language = /[\u0600-\u06FF]/.test(message) ? 'ar' : 'en'

  console.log(JSON.stringify({
    tag: 'INTENT_DETECTION',
    intent: detection.intent,
    confidence: detection.confidence,
    reason: detection.reason,
    phone: phoneNumber,
  }))

  // Step 2: Route by intent
  switch (detection.intent) {
    // COMPANY: Return static company info (never call AI)
    case 'company': {
      const content = getCompanyInfoAsString(language)
      return {
        type: 'direct',
        content,
        language,
        metadata: {
          handoff: false,
          routing: 'company_handler',
        },
      }
    }

    // AGENT: Return agent contact (never call AI)
    case 'agent': {
      // Extract agent name from memory if mentioned
      const message_lower = message.toLowerCase()
      const agentNameMatch = message_lower.match(/\b(hammad|waheed|laiba|sarosh|imran|anushka|asif|tanzeel|ayaz|hrithik|sarah)\b/)
      const agentName = agentNameMatch?.[1]

      let response: AgentResponse | null = null
      if (agentName) {
        response = getAgentByName(agentName, language)
      }

      if (!response) {
        // Use best agent based on area/budget
        const area = typeof memory.area === 'string' ? memory.area : undefined
        const maxPrice = typeof memory.maxBudget === 'number' ? memory.maxBudget : undefined
        response = getAgentResponse(language, area, maxPrice)
      }

      return {
        type: 'direct',
        content: response.content,
        language,
        metadata: {
          handoff: true,
          routing: 'agent_handler',
          agent: response.agent,
        },
      }
    }

    // PROPERTY: Query database, return results or defer to AI
    case 'property': {
      // Extract property search details
      const propertyDetails = extractPropertyDetails(message, memory as any)

      if (!propertyDetails.shouldSearch) {
        // Shouldn't happen, but fallback to AI
        return {
          type: 'defer_to_ai',
          language,
        }
      }

      if (!propertyDetails.area) {
        return {
          type: 'query',
          data: {
            found: false,
            message: language === 'ar'
              ? 'من فضلك حدّد المنطقة أولاً حتى أستطيع عرض العقارات المتاحة بدقة.'
              : 'Please specify a location first so I can show exact available properties.',
            noResultReason: 'missing_location',
          },
          language,
        }
      }

      // Query database
      const propertyResponse = await queryProperties({
        orgId,
        area: propertyDetails.area,
        bedrooms: propertyDetails.bedrooms,
        maxPrice: propertyDetails.maxPrice,
        minPrice: propertyDetails.minPrice,
        transactionType: propertyDetails.transactionType,
        category: propertyDetails.category,
      })

      // No properties found → return static error
      if (!propertyResponse.found) {
        return {
          type: 'query',
          data: propertyResponse,
          language,
        }
      }

      // Properties found → defer to AI for formatting
      return {
        type: 'query',
        data: propertyResponse,
        language,
      }
    }

    // FAQ & GENERAL: Defer to existing router.ts
    default: {
      return {
        type: 'defer_to_ai',
        language,
      }
    }
  }
}
