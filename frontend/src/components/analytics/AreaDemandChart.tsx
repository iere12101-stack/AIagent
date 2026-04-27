'use client'

import { MapPin } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { AreaDemandDatum } from '@/types'

const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#14b8a6', '#f97316']

interface AreaDemandChartProps {
  data: AreaDemandDatum[]
  loading?: boolean
  height?: number
}

export function AreaDemandChart({
  data,
  loading = false,
  height = 340,
}: AreaDemandChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-52" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[340px] w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-emerald-600" />
          Area Demand
        </CardTitle>
        <CardDescription>Top districts and areas requested by contacts.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} className="stroke-muted" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="area" tick={{ fontSize: 10 }} width={95} />
            <Tooltip />
            <Bar dataKey="count" name="Enquiries" radius={[0, 6, 6, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export default AreaDemandChart
