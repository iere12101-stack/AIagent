export class ROICalculator {
  
  static calculateGrossYield(annualRent: number, propertyPrice: number): number {
    if (propertyPrice <= 0) return 0
    return (annualRent / propertyPrice) * 100
  }

  static calculateMortgage(
    propertyPrice: number, 
    downPaymentPercent: number = 20,
    interestRate: number = 4.5,
    loanTermYears: number = 25
  ): {
    downPayment: number
    loanAmount: number
    monthlyPayment: number
    totalInterest: number
    totalPayment: number
  } {
    const downPayment = propertyPrice * (downPaymentPercent / 100)
    const loanAmount = propertyPrice - downPayment
    const monthlyRate = interestRate / 100 / 12
    const numPayments = loanTermYears * 12

    // Monthly mortgage payment formula
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)

    const totalPayment = monthlyPayment * numPayments
    const totalInterest = totalPayment - loanAmount

    return {
      downPayment,
      loanAmount,
      monthlyPayment,
      totalInterest,
      totalPayment
    }
  }

  static calculateNetYield(
    annualRent: number,
    propertyPrice: number,
    serviceCharges: number = 15, // per sqft per year
    propertySize: number,
    dldFee: number = 4, // 4% of property price
    agencyFee: number = 2, // 2% of annual rent
    maintenanceReserve: number = 1 // 1% of property value per year
  ): {
    grossYield: number
    totalAnnualCosts: number
    netAnnualIncome: number
    netYield: number
  } {
    const grossYield = this.calculateGrossYield(annualRent, propertyPrice)
    
    // Calculate annual costs
    const annualServiceCharges = serviceCharges * propertySize
    const annualDLDFeeAmortized = (propertyPrice * dldFee / 100) / 25 // 25 years amortization
    const annualAgencyFee = annualRent * agencyFee / 100
    const annualMaintenance = propertyPrice * maintenanceReserve / 100
    
    const totalAnnualCosts = annualServiceCharges + annualDLDFeeAmortized + 
                           annualAgencyFee + annualMaintenance
    
    const netAnnualIncome = annualRent - totalAnnualCosts
    const netYield = (netAnnualIncome / propertyPrice) * 100

    return {
      grossYield,
      totalAnnualCosts,
      netAnnualIncome,
      netYield
    }
  }

  static checkGoldenVisaEligibility(propertyPrice: number): {
    eligible: boolean
    category: 'none' | 'silver' | 'golden'
    requirements: string[]
  } {
    if (propertyPrice >= 2000000) {
      return {
        eligible: true,
        category: 'golden',
        requirements: [
          'Property value: AED 2M+',
          '10-year Golden Visa',
          'Can sponsor family',
          'No sponsor required for business'
        ]
      }
    } else if (propertyPrice >= 750000) {
      return {
        eligible: true,
        category: 'silver',
        requirements: [
          'Property value: AED 750K - 1.999M',
          '10-year residency visa',
          'Can sponsor family',
          'Business setup allowed with local partner'
        ]
      }
    } else {
      return {
        eligible: false,
        category: 'none',
        requirements: [
          'Property must be AED 750K+ for visa eligibility',
          'Consider properties in higher price range for visa benefits'
        ]
      }
    }
  }

  static formatROIAnalysis(
    property: any,
    language: 'en' | 'ar' = 'en'
  ): string {
    const price = Number(property.price_aed)
    const size = Number(property.size_sqft) || 1000
    
    // Estimate annual rent (8% gross yield assumption)
    const estimatedAnnualRent = price * 0.08
    
    const mortgage = this.calculateMortgage(price)
    const roi = this.calculateNetYield(estimatedAnnualRent, price, 15, size)
    const visa = this.checkGoldenVisaEligibility(price)

    if (language === 'ar') {
      return [
        `*ROI Analysis for ${property.ref}*`,
        `Property Price: AED ${price.toLocaleString()}`,
        `Estimated Annual Rent: AED ${estimatedAnnualRent.toLocaleString()}`,
        `Gross Yield: ${roi.grossYield.toFixed(2)}%`,
        `Net Yield: ${roi.netYield.toFixed(2)}%`,
        `Monthly Mortgage: AED ${mortgage.monthlyPayment.toFixed(0)}`,
        `Down Payment: AED ${mortgage.downPayment.toLocaleString()}`,
        visa.eligible ? `Visa: ${visa.category} visa eligible` : 'Visa: Not eligible for investor visa',
        `---`,
        `Note: These are estimates. Actual returns may vary.`
      ].join('\n')
    }

    return [
      `*ROI Analysis for ${property.ref}*`,
      `Property Price: AED ${price.toLocaleString()}`,
      `Estimated Annual Rent: AED ${estimatedAnnualRent.toLocaleString()}`,
      `Gross Yield: ${roi.grossYield.toFixed(2)}%`,
      `Net Yield: ${roi.netYield.toFixed(2)}%`,
      `Monthly Mortgage: AED ${mortgage.monthlyPayment.toFixed(0)}`,
      `Down Payment: AED ${mortgage.downPayment.toLocaleString()}`,
      visa.eligible ? `Visa: ${visa.category} visa eligible` : 'Visa: Not eligible for investor visa',
      `---`,
      `Note: These are estimates. Actual returns may vary.`
    ].join('\n')
  }
}
