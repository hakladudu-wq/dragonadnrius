"use client"

import { useEffect, useState, useCallback } from "react"
import useSWR from "swr"
import { Crown, Trophy, Eye, EyeOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"

interface RankedUser {
  id: string
  email: string
  name: string | null
  revenue: number
  sales: number
  position: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Formata valores de faturamento de forma compacta: 860500 -> "R$ 860.5k"
function formatCompact(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(1)}k`
  return `R$ ${value.toFixed(0)}`
}

function displayName(user: RankedUser) {
  return user.name || user.email?.split("@")[0] || "Sem nome"
}

function getInitial(user: RankedUser) {
  return (user.name || user.email || "?").charAt(0).toUpperCase()
}

// Define o "tier" com base no faturamento do vendedor
function getTier(revenue: number) {
  if (revenue >= 500_000)
    return { label: "ABYSSAL PREDATOR", className: "bg-rose-500/15 text-rose-400" }
  if (revenue >= 100_000)
    return { label: "ABYSSAL BARON", className: "bg-violet-500/15 text-violet-400" }
  if (revenue >= 20_000)
    return { label: "ABYSSAL KNIGHT", className: "bg-sky-500/15 text-sky-400" }
  return { label: "ABYSSAL ROOKIE", className: "bg-muted text-muted-foreground" }
}

// Estilos do badge de posicao (#1 dourado, #2 prata, #3 bronze)
function positionBadge(position: number) {
  switch (position) {
    case 1:
      return "bg-amber-400/20 text-amber-400 border-amber-400/30"
    case 2:
      return "bg-slate-300/20 text-slate-300 border-slate-300/30"
    case 3:
      return "bg-orange-500/20 text-orange-400 border-orange-500/30"
    default:
      return "bg-muted text-muted-foreground border-border"
  }
}

// Estilos do pill de faturamento (destaque dourado no #1)
function revenuePill(position: number) {
  if (position === 1) return "bg-amber-400/15 text-amber-400"
  if (position === 3) return "bg-orange-500/15 text-orange-400"
  return "bg-muted text-foreground"
}

export function DashboardRanking() {
  const { session } = useAuth()
  const [tab, setTab] = useState<"concurso" | "mensal">("mensal")
  const [hideValues, setHideValues] = useState(false)

  const { data, isLoading } = useSWR<{ ranking: RankedUser[] }>(
    "/api/ranking",
    fetcher,
    { refreshInterval: 60000 },
  )

  const top5 = (data?.ranking || []).slice(0, 5)

  return (
    <div className="bg-card rounded-[24px] p-5 shadow-sm border border-border flex flex-col h-full">
      {/* Cabecalho */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 flex items-center justify-center shrink-0">
            <Crown className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h3 className="font-bold text-foreground leading-tight">Top 5 Players</h3>
            <p className="text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase">
              Corrida de Faturamento
            </p>
          </div>
        </div>
        <button
          onClick={() => setHideValues((v) => !v)}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label={hideValues ? "Mostrar valores" : "Ocultar valores"}
        >
          {hideValues ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setTab("concurso")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
            tab === "concurso"
              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
              : "text-muted-foreground hover:bg-muted border border-transparent",
          )}
        >
          <Trophy size={14} />
          Concurso
        </button>
        <button
          onClick={() => setTab("mensal")}
          className={cn(
            "flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
            tab === "mensal"
              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
              : "text-muted-foreground hover:bg-muted border border-transparent",
          )}
        >
          <Crown size={14} />
          Mensal
        </button>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2 max-h-[380px]">
        {tab === "concurso" ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-9 w-9 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum concurso ativo</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Em breve, disputas por prêmios
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-rose-400 animate-spin" />
          </div>
        ) : top5.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-9 w-9 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma venda ainda</p>
          </div>
        ) : (
          top5.map((user) => {
            const tier = getTier(user.revenue)
            const isMe = user.id === session?.userId
            return (
              <div
                key={user.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-2xl bg-secondary/50 border transition-colors",
                  isMe ? "border-rose-500/40" : "border-border/50 hover:border-border",
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ring-2",
                    user.position === 1
                      ? "ring-amber-400/60 bg-amber-400/10 text-amber-400"
                      : user.position === 3
                        ? "ring-orange-500/50 bg-orange-500/10 text-orange-400"
                        : "ring-border bg-muted text-muted-foreground",
                  )}
                >
                  {getInitial(user)}
                </div>

                {/* Nome + tier */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {displayName(user)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0",
                        positionBadge(user.position),
                      )}
                    >
                      #{user.position}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "inline-block mt-1 text-[9px] font-bold tracking-wide px-2 py-0.5 rounded",
                      tier.className,
                    )}
                  >
                    {tier.label}
                  </span>
                </div>

                {/* Faturamento */}
                <div
                  className={cn(
                    "px-3 py-2 rounded-xl text-sm font-bold shrink-0",
                    revenuePill(user.position),
                  )}
                >
                  {hideValues ? "R$ ••••" : formatCompact(user.revenue)}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
