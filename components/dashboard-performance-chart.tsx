"use client"

import useSWR from "swr"
import { Activity } from "lucide-react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Payment {
  status: string
  amount: number | string
  created_at: string
}

interface PerformanceChartProps {
  userId?: string
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]

// Monta os ultimos 7 dias (buckets) a partir dos pagamentos aprovados
function buildSeries(payments: Payment[]) {
  const days: { key: string; label: string; receita: number }[] = []
  const now = new Date()

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const key = d.toISOString().slice(0, 10)
    days.push({ key, label: WEEKDAYS[d.getDay()], receita: 0 })
  }

  for (const p of payments) {
    if (p.status !== "approved") continue
    const key = new Date(p.created_at).toISOString().slice(0, 10)
    const bucket = days.find((day) => day.key === key)
    if (bucket) bucket.receita += Number(p.amount) || 0
  }

  return days
}

export function DashboardPerformanceChart({ userId }: PerformanceChartProps) {
  const { data } = useSWR<{ payments: Payment[] }>(
    userId
      ? `/api/payments/list?userId=${userId}&period=7days&limit=500&offset=0`
      : null,
    fetcher,
    { refreshInterval: 30000 },
  )

  const series = buildSeries(data?.payments || [])
  const hasData = series.some((d) => d.receita > 0)

  return (
    <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col h-full min-h-[280px]">
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Activity size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground leading-tight">Seu Desempenho</h3>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">
            Últimos 7 dias
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-xs text-muted-foreground">Receita</span>
      </div>

      <div className="flex-1 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="receitaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              dy={8}
            />
            <YAxis hide domain={[0, hasData ? "auto" : 1]} />
            <Tooltip
              cursor={{ stroke: "hsl(var(--border))" }}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 12,
                fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(value: number) => [
                `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                "Receita",
              ]}
            />
            <Area
              type="monotone"
              dataKey="receita"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#receitaFill)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
