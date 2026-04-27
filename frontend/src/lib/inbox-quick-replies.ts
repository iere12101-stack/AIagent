export interface QuickReplyEntry {
  id: string
  label: string
  text: string
  category: string
}

export const QUICK_REPLY_CATALOG: QuickReplyEntry[] = [
  {
    id: 'welcome',
    label: 'Welcome',
    text: 'Welcome to Investment Experts Real Estate. How can I help you today?',
    category: 'Greeting',
  },
  {
    id: 'viewing',
    label: 'Schedule viewing',
    text: 'I can help arrange a viewing. What day and time works best for you?',
    category: 'Booking',
  },
  {
    id: 'budget',
    label: 'Ask budget',
    text: 'What budget range would you like me to match for you?',
    category: 'Qualification',
  },
  {
    id: 'area',
    label: 'Ask area',
    text: 'Which Dubai area are you most interested in right now?',
    category: 'Qualification',
  },
  {
    id: 'beds',
    label: 'Ask bedrooms',
    text: 'How many bedrooms would you like me to look for?',
    category: 'Qualification',
  },
  {
    id: 'brochure',
    label: 'Send brochure',
    text: 'I can share more details, floor plans, and availability with you.',
    category: 'Property',
  },
  {
    id: 'roi',
    label: 'ROI info',
    text: 'I can also help compare ROI, service charges, and payment plans if that helps.',
    category: 'Investment',
  },
  {
    id: 'handoff',
    label: 'Human handoff',
    text: 'I can connect you with one of our property specialists right away.',
    category: 'Support',
  },
  {
    id: 'followup',
    label: 'Follow up',
    text: 'Just checking in. Would you like me to send a few matching options?',
    category: 'Follow Up',
  },
  {
    id: 'callback',
    label: 'Request callback',
    text: 'If you prefer, I can arrange a callback from the right specialist.',
    category: 'Support',
  },
]
