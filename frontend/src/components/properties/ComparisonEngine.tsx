'use client'

import { PropertyComparison } from './PropertyComparison'
import type { Property } from './PropertyDetailSheet'

export interface ComparisonEngineProps {
  properties: Property[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewProperty: (property: Property) => void
}

export function ComparisonEngine(props: ComparisonEngineProps) {
  return <PropertyComparison {...props} />
}

export default ComparisonEngine
