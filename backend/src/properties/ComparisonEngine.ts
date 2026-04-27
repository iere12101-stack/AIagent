import { PropertyMatch } from './PropertyMatcher.js'
import { ROICalculator } from './ROICalculator.js'

export class ComparisonEngine {
  
  static compareProperties(properties: PropertyMatch[], language: 'en' | 'ar' = 'en'): string {
    if (properties.length < 2) {
      return language === 'ar' 
        ? 'Please provide at least 2 properties for comparison.'
        : 'Please provide at least 2 properties for comparison.'
    }

    if (properties.length > 3) {
      properties = properties.slice(0, 3) // Limit to 3 properties
    }

    const headers = language === 'ar' 
      ? ['Property', 'Price/AED', 'Size/sqft', 'Yield%', 'Location']
      : ['Property', 'Price/AED', 'Size/sqft', 'Yield%', 'Location']

    const rows = properties.map(p => {
      const pricePerSqft = p.size_sqft ? (p.price_aed / p.size_sqft).toFixed(0) : 'N/A'
      const estimatedYield = this.estimateYield(p.price_aed)
      
      return [
        p.ref,
        p.price_aed.toLocaleString(),
        p.size_sqft?.toLocaleString() || 'N/A',
        `${estimatedYield}%`,
        `${p.district} - ${p.building}`
      ]
    })

    // Format comparison table
    let comparison = `*${language === 'ar' ? 'Property Comparison' : 'Property Comparison'}*\n\n`
    
    // Header
    comparison += `| ${headers.join(' | ')} |\n`
    comparison += `|${headers.map(() => '---').join('|')}|\n`
    
    // Rows
    rows.forEach(row => {
      comparison += `| ${row.join(' | ')} |\n`
    })

    // Add insights
    comparison += `\n*${language === 'ar' ? 'Key Insights' : 'Key Insights'}:*\n`
    
    const insights = this.generateInsights(properties)
    insights.forEach((insight, index) => {
      comparison += `${index + 1}. ${insight}\n`
    })

    return comparison
  }

  private static estimateYield(price: number): string {
    let yieldPercent: number
    
    if (price < 1000000) {
      yieldPercent = 9.2
    } else if (price < 2000000) {
      yieldPercent = 8.4
    } else if (price < 5000000) {
      yieldPercent = 7.2
    } else {
      yieldPercent = 6.1
    }
    
    return yieldPercent.toFixed(1)
  }

  private static generateInsights(properties: PropertyMatch[]): string[] {
    const insights: string[] = []
    
    // Price per sqft comparison
    const pricePerSqftValues = properties
      .filter(p => p.size_sqft)
      .map(p => p.price_aed / p.size_sqft!)
    
    if (pricePerSqftValues.length > 1) {
      const minPricePerSqft = Math.min(...pricePerSqftValues)
      const maxPricePerSqft = Math.max(...pricePerSqftValues)
      const bestValueIndex = pricePerSqftValues.indexOf(minPricePerSqft)
      
      insights.push(`${properties[bestValueIndex].ref} offers best value at AED ${minPricePerSqft.toFixed(0)}/sqft`)
    }

    // Location diversity
    const districts = [...new Set(properties.map(p => p.district))]
    if (districts.length > 1) {
      insights.push(`Properties span ${districts.length} different areas: ${districts.join(', ')}`)
    }

    // Price range analysis
    const prices = properties.map(p => p.price_aed)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

    if (priceRange > avgPrice) {
      insights.push(`Wide price range: AED ${minPrice.toLocaleString()} - AED ${maxPrice.toLocaleString()}`)
    }

    // Bedroom variety
    const bedroomTypes = [...new Set(properties.map(p => p.bedrooms).filter(Boolean))]
    if (bedroomTypes.length > 1) {
      insights.push(`Mix of unit types: ${bedroomTypes.join(', ')}`)
    }

    // Investment recommendation
    const topYieldProperty = this.getTopYieldProperty(properties)
    if (topYieldProperty) {
      insights.push(`${topYieldProperty.ref} shows highest rental yield potential`)
    }

    return insights
  }

  private static getTopYieldProperty(properties: PropertyMatch[]): PropertyMatch | null {
    // Estimate yield for each property and return the best one
    let bestProperty: PropertyMatch | null = null
    let bestYield = 0

    for (const property of properties) {
      const yieldPercent = parseFloat(this.estimateYield(property.price_aed))
      if (yieldPercent > bestYield) {
        bestYield = yieldPercent
        bestProperty = property
      }
    }

    return bestProperty
  }

  static generateDetailedComparison(
    properties: PropertyMatch[], 
    language: 'en' | 'ar' = 'en'
  ): string {
    if (properties.length < 2) {
      return this.compareProperties(properties, language)
    }

    let detailed = this.compareProperties(properties, language)
    detailed += `\n\n*${language === 'ar' ? 'Detailed Analysis' : 'Detailed Analysis'}:*\n\n`

    properties.forEach((property, index) => {
      detailed += `*${property.ref} - ${language === 'ar' ? 'Detailed Breakdown' : 'Detailed Breakdown'}:*\n`
      detailed += ROICalculator.formatROIAnalysis(property, language)
      detailed += '\n\n'
    })

    return detailed
  }
}
