'use client'

import { useMemo, useState } from 'react'
import { Building2, Calculator, Landmark, Percent, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const AREA_YIELD_BENCHMARKS: Record<string, number> = {
  jvc: 7.2,
  'dubai marina': 6.1,
  'downtown dubai': 5.2,
  'business bay': 5.9,
  jlt: 6.5,
}

function getAreaYield(area?: string | null): number {
  if (!area) {
    return 5.5
  }

  const normalized = area.toLowerCase()
  const directMatch = AREA_YIELD_BENCHMARKS[normalized]
  if (directMatch) {
    return directMatch
  }

  const partialMatch = Object.entries(AREA_YIELD_BENCHMARKS).find(([key]) =>
    normalized.includes(key),
  )

  return partialMatch?.[1] ?? 5.5
}

function calculateMortgagePayment(
  principal: number,
  annualRatePercent: number,
  termYears: number,
): number {
  if (principal <= 0 || annualRatePercent <= 0 || termYears <= 0) {
    return 0
  }

  const monthlyRate = annualRatePercent / 100 / 12
  const totalPayments = termYears * 12

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1)
  )
}

interface ROICalculatorProps {
  initialPrice?: number
  estimatedAnnualRent?: number
  district?: string | null
  sizeSqft?: number | null
}

export function ROICalculator({
  initialPrice = 0,
  estimatedAnnualRent,
  district,
  sizeSqft,
}: ROICalculatorProps) {
  const benchmarkYield = getAreaYield(district)
  const [purchasePrice, setPurchasePrice] = useState(
    initialPrice > 0 ? String(initialPrice) : '',
  )
  const [annualRent, setAnnualRent] = useState(
    estimatedAnnualRent && estimatedAnnualRent > 0
      ? String(estimatedAnnualRent)
      : initialPrice > 0
      ? String(Math.round(initialPrice * (benchmarkYield / 100)))
      : '',
  )
  const [downPaymentPercent, setDownPaymentPercent] = useState('20')
  const [interestRate, setInterestRate] = useState('4.5')
  const [loanTermYears, setLoanTermYears] = useState('25')

  const metrics = useMemo(() => {
    const price = Number(purchasePrice) || 0
    const rent = Number(annualRent) || 0
    const downPaymentRatio = (Number(downPaymentPercent) || 0) / 100
    const financingAmount = Math.max(price * (1 - downPaymentRatio), 0)
    const dldFee = price * 0.04
    const grossYield = price > 0 ? (rent / price) * 100 : 0
    const mortgage = calculateMortgagePayment(
      financingAmount,
      Number(interestRate) || 0,
      Number(loanTermYears) || 0,
    )
    const monthlyRent = rent / 12
    const monthlyCashFlow = monthlyRent - mortgage
    const pricePerSqft =
      sizeSqft && sizeSqft > 0 && price > 0 ? Math.round(price / sizeSqft) : null

    return {
      dldFee,
      grossYield,
      mortgage,
      monthlyCashFlow,
      goldenVisaEligible: price >= 2_000_000,
      pricePerSqft,
    }
  }, [annualRent, downPaymentPercent, interestRate, loanTermYears, purchasePrice, sizeSqft])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-emerald-600" />
          ROI Calculator
        </CardTitle>
        <CardDescription>
          Dubai-focused ROI, financing, and visa indicators for this listing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="roi-price">Purchase price (AED)</Label>
            <Input
              id="roi-price"
              inputMode="numeric"
              value={purchasePrice}
              onChange={(event) => setPurchasePrice(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roi-rent">Estimated annual rent (AED)</Label>
            <Input
              id="roi-rent"
              inputMode="numeric"
              value={annualRent}
              onChange={(event) => setAnnualRent(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roi-down-payment">Down payment (%)</Label>
            <Input
              id="roi-down-payment"
              inputMode="decimal"
              value={downPaymentPercent}
              onChange={(event) => setDownPaymentPercent(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roi-interest-rate">Interest rate (%)</Label>
            <Input
              id="roi-interest-rate"
              inputMode="decimal"
              value={interestRate}
              onChange={(event) => setInterestRate(event.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Percent className="h-4 w-4 text-emerald-600" />
              Gross yield
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {metrics.grossYield.toFixed(2)}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Area benchmark: {benchmarkYield.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-4 w-4 text-blue-600" />
              DLD fee
            </div>
            <p className="mt-2 text-2xl font-semibold">
              AED {Math.round(metrics.dldFee).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Fixed at 4% of purchase price</p>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Landmark className="h-4 w-4 text-amber-600" />
              Monthly mortgage
            </div>
            <p className="mt-2 text-2xl font-semibold">
              AED {Math.round(metrics.mortgage).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Based on {loanTermYears || '25'}-year financing
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Monthly cash flow
            </div>
            <p className="mt-2 text-2xl font-semibold">
              AED {Math.round(metrics.monthlyCashFlow).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Rent minus estimated mortgage cost
            </p>
          </div>

          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-4 w-4 text-violet-600" />
              Visa eligibility
            </div>
            <div className="mt-2">
              <Badge variant={metrics.goldenVisaEligible ? 'default' : 'secondary'}>
                {metrics.goldenVisaEligible ? 'Golden Visa Eligible' : 'Below AED 2M threshold'}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {metrics.pricePerSqft
                ? `Approx. AED ${metrics.pricePerSqft.toLocaleString()} / sqft`
                : 'Add size data to estimate AED / sqft'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ROICalculator
