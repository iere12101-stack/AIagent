'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calculator, TrendingUp, DollarSign, Percent, Building2, BarChart3 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

interface ROISettings {
  propertyPrice: string
  annualRent: string
  maintenance: string
  mortgageAmount: string
  interestRate: string
  loanTerm: string
}

const DUBAI_BENCHMARKS = [
  { area: 'JVC', range: '6–8%', color: 'text-emerald-600' },
  { area: 'Dubai Marina', range: '5–7%', color: 'text-blue-600' },
  { area: 'Downtown Dubai', range: '4–6%', color: 'text-purple-600' },
  { area: 'Dubai Hills', range: '5–7%', color: 'text-amber-600' },
  { area: 'Palm Jumeirah', range: '3–5%', color: 'text-rose-600' },
  { area: 'Business Bay', range: '5–7%', color: 'text-cyan-600' },
  { area: 'JLT', range: '6–8%', color: 'text-indigo-600' },
  { area: 'Dubai Creek Harbour', range: '5–7%', color: 'text-teal-600' },
]

export function ROICalculator() {
  const [values, setValues] = useState<ROISettings>({
    propertyPrice: '',
    annualRent: '',
    maintenance: '0',
    mortgageAmount: '',
    interestRate: '4.5',
    loanTerm: '25',
  })
  const [calculated, setCalculated] = useState(false)

  const updateField = (field: keyof ROISettings, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setCalculated(false)
  }

  const results = useMemo(() => {
    const price = parseFloat(values.propertyPrice) || 0
    const rent = parseFloat(values.annualRent) || 0
    const maintenance = parseFloat(values.maintenance) || 0
    const mortgage = parseFloat(values.mortgageAmount) || 0
    const rate = parseFloat(values.interestRate) || 0
    const term = parseFloat(values.loanTerm) || 25

    if (price === 0 || rent === 0) return null

    // Gross Rental Yield
    const grossYield = (rent / price) * 100

    // Net ROI
    const netROI = ((rent - maintenance) / price) * 100

    // Monthly Mortgage Payment (standard amortization)
    const monthlyRate = rate / 100 / 12
    const totalPayments = term * 12
    let monthlyPayment = 0
    if (mortgage > 0 && rate > 0) {
      monthlyPayment =
        (mortgage * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1)
    }

    // Cash Flow
    const monthlyRent = rent / 12
    const monthlyMaintenance = maintenance / 12
    const cashFlow = monthlyRent - monthlyPayment - monthlyMaintenance

    // DLD Transfer Fee (4%)
    const dldFee = price * 0.04

    // Down Payment
    const downPayment = price - mortgage

    // Cash on Cash Return
    const annualCashFlow = cashFlow * 12
    const cashOnCashReturn = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0

    return {
      grossYield,
      netROI,
      monthlyPayment,
      cashFlow,
      dldFee,
      cashOnCashReturn,
      downPayment,
    }
  }, [values])

  const handleCalculate = () => {
    if (results) setCalculated(true)
  }

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
            <Calculator className="h-5 w-5 text-emerald-600" />
          </div>
          Quick ROI Calculator
        </CardTitle>
        <CardDescription>Dubai Property ROI Calculator</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Property Price (AED)</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">AED</span>
                <Input
                  type="number"
                  placeholder="1,500,000"
                  className="pl-11 h-9 text-sm"
                  value={values.propertyPrice}
                  onChange={(e) => updateField('propertyPrice', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Expected Annual Rent (AED)</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">AED</span>
                <Input
                  type="number"
                  placeholder="80,000"
                  className="pl-11 h-9 text-sm"
                  value={values.annualRent}
                  onChange={(e) => updateField('annualRent', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Maintenance/HOA (AED/year)</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">AED</span>
                <Input
                  type="number"
                  placeholder="0"
                  className="pl-11 h-9 text-sm"
                  value={values.maintenance}
                  onChange={(e) => updateField('maintenance', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mortgage Amount (AED, optional)</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">AED</span>
                <Input
                  type="number"
                  placeholder="1,000,000"
                  className="pl-11 h-9 text-sm"
                  value={values.mortgageAmount}
                  onChange={(e) => updateField('mortgageAmount', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Interest Rate (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="4.5"
                  className="pr-8 h-9 text-sm"
                  value={values.interestRate}
                  onChange={(e) => updateField('interestRate', e.target.value)}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">%</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Loan Term (years)</Label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="25"
                  className="pr-14 h-9 text-sm"
                  value={values.loanTerm}
                  onChange={(e) => updateField('loanTerm', e.target.value)}
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">years</span>
              </div>
            </div>
          </div>

          {/* Calculate Button */}
          <Button
            onClick={handleCalculate}
            disabled={!results}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculate ROI
          </Button>

          {/* Results */}
          {calculated && results && (
            <div className="space-y-3 animate-fade-in-up">
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <ResultCard
                  icon={<Percent className="h-4 w-4 text-emerald-600" />}
                  label="Gross Rental Yield"
                  value={`${results.grossYield.toFixed(2)}%`}
                  positive={results.grossYield > 5}
                />
                <ResultCard
                  icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                  label="Net ROI"
                  value={`${results.netROI.toFixed(2)}%`}
                  positive={results.netROI > 4}
                />
                <ResultCard
                  icon={<DollarSign className="h-4 w-4 text-blue-600" />}
                  label="Monthly Mortgage"
                  value={`AED ${results.monthlyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <ResultCard
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="Monthly Cash Flow"
                  value={`AED ${results.cashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  positive={results.cashFlow > 0}
                />
                <ResultCard
                  icon={<Building2 className="h-4 w-4 text-amber-600" />}
                  label="DLD Transfer Fee"
                  value={`AED ${results.dldFee.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                />
                <ResultCard
                  icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
                  label="Cash on Cash Return"
                  value={`${results.cashOnCashReturn.toFixed(2)}%`}
                  positive={results.cashOnCashReturn > 5}
                />
              </div>
            </div>
          )}

          {/* Dubai Benchmarks */}
          <Separator />
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Typical Dubai ROI Benchmarks
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DUBAI_BENCHMARKS.map((b) => (
                <div key={b.area} className="rounded-lg bg-muted/50 p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{b.area}</p>
                  <p className={`text-sm font-bold ${b.color}`}>{b.range}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ResultCard({
  icon,
  label,
  value,
  positive,
}: {
  icon: React.ReactNode
  label: string
  value: string
  positive?: boolean
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className={`text-sm font-bold ${positive === undefined ? 'text-foreground' : positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {value}
      </p>
    </div>
  )
}
