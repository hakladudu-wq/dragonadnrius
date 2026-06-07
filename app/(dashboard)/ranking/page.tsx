"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Crown,
  Trophy,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingBag,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"

interface RankedUser {
  id: string
  email: string
  name: string | null
  revenue: number
  sales: number
  position: number
}

interface RankingSummary {
  totalUsers: number
  totalRevenue: number
  totalSales: number
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function getInitial(user: RankedUser) {
  return (user.name || user.email || "?").charAt(0).toUpperCase()
}

function displayName(user: RankedUser) {
  return user.name || user.email?.split("@")[0] || "Sem nome"
}

export default function RankingPage() {
  const { session } = useAuth()
  const [ranking, setRanking] = useState<RankedUser[]>([])
  const [summary, setSummary] = useState<RankingSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  const loadRanking = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch("/api/ranking")
      if (res.ok) {
        const data = await res.json()
        setRanking(data.ranking || [])
        setSummary(data.summary || null)
      } else {
        console.error("[v0] Ranking - API error:", await res.text())
      }
    } catch (error) {
      console.error("[v0] Ranking - erro:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRanking()
  }, [loadRanking])

  const topThree = ranking.slice(0, 3)
  const rest = ranking.slice(3).filter(
    (u) =>
      displayName(u).toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  )

  // Posicao do usuario logado no ranking
  const myEntry = ranking.find((u) => u.id === session?.userId)

  // Ordem visual do podio: 2 lugar, 1 lugar (centro), 3 lugar
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean)

  return (
    <ScrollArea className="flex-1">
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-xl bg-accent flex items-center justify-center">
              <Crown className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground text-balance">
                Ranking de Vendedores
              </h1>
              <p className="text-sm text-muted-foreground">
                Os que mais faturam na Dragon
              </p>
            </div>
          </div>
          <button
            onClick={loadRanking}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-all self-start"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Atualizar
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            icon={<DollarSign className="h-5 w-5 text-accent" />}
            label="Faturamento total"
            value={formatCurrency(summary?.totalRevenue || 0)}
          />
          <SummaryCard
            icon={<ShoppingBag className="h-5 w-5 text-accent" />}
            label="Vendas totais"
            value={String(summary?.totalSales || 0)}
          />
          <SummaryCard
            icon={<Users className="h-5 w-5 text-accent" />}
            label="Vendedores no ranking"
            value={String(summary?.totalUsers || 0)}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-7 h-7 text-accent animate-spin" />
          </div>
        ) : ranking.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 rounded-xl bg-card border border-border">
            <Trophy className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Seja o primeiro a aparecer no ranking!
            </p>
          </div>
        ) : (
          <>
            {/* Podio Top 3 */}
            <div className="grid grid-cols-3 gap-3 sm:gap-5 items-end">
              {podiumOrder.map((user) => (
                <PodiumCard
                  key={user.id}
                  user={user}
                  isMe={user.id === session?.userId}
                />
              ))}
            </div>

            {/* Posicao do usuario logado (se nao estiver no top 3) */}
            {myEntry && myEntry.position > 3 && (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 flex items-center gap-4">
                <Sparkles className="h-5 w-5 text-accent shrink-0" />
                <p className="text-sm text-foreground">
                  Voce esta em{" "}
                  <span className="font-bold text-accent">
                    {myEntry.position}o lugar
                  </span>{" "}
                  com {formatCurrency(myEntry.revenue)} em {myEntry.sales} vendas. Continue
                  vendendo para subir no ranking!
                </p>
              </div>
            )}

            {/* Lista dos demais */}
            {ranking.length > 3 && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    Demais colocados
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      placeholder="Buscar vendedor..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full sm:w-72 pl-10 pr-4 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground bg-card border border-border focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-card border border-border overflow-hidden divide-y divide-border">
                  {rest.map((user) => (
                    <RankRow
                      key={user.id}
                      user={user}
                      isMe={user.id === session?.userId}
                    />
                  ))}
                  {rest.length === 0 && (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum resultado
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ScrollArea>
  )
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-card border border-border p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold text-foreground truncate">{value}</p>
        </div>
      </div>
    </div>
  )
}

function PodiumCard({ user, isMe }: { user: RankedUser; isMe: boolean }) {
  const isFirst = user.position === 1
  const isSecond = user.position === 2

  // Top 1 em dourado, top 2 prata, top 3 bronze
  const accentColor = isFirst ? "#FFC700" : isSecond ? "#cbd5e1" : "#d9842b"

  return (
    <div className={cn("flex flex-col items-center", isFirst ? "pt-2" : "pt-6")}>
      {/* Avatar com coroa no top 1 */}
      <div className="relative mb-3">
        {isFirst && (
          <Crown
            className="absolute -top-5 left-1/2 -translate-x-1/2 h-7 w-7 drop-shadow"
            style={{ color: accentColor }}
            fill={accentColor}
          />
        )}
        <div
          className={cn(
            "rounded-2xl flex items-center justify-center font-bold text-black",
            isFirst ? "w-16 h-16 sm:w-20 sm:h-20 text-xl sm:text-2xl" : "w-14 h-14 sm:w-16 sm:h-16 text-lg sm:text-xl"
          )}
          style={{
            background: accentColor,
            boxShadow: isFirst ? `0 0 24px ${accentColor}55` : undefined,
          }}
        >
          {getInitial(user)}
        </div>
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-background"
          style={{ background: accentColor }}
        >
          {user.position}
        </div>
      </div>

      <div
        className="w-full rounded-xl border p-3 sm:p-4 text-center"
        style={{
          borderColor: isFirst ? `${accentColor}66` : undefined,
          background: isFirst ? `${accentColor}14` : undefined,
        }}
      >
        <p className="text-xs sm:text-sm font-semibold text-foreground truncate" title={displayName(user)}>
          {displayName(user)}
          {isMe && <span className="text-accent"> (voce)</span>}
        </p>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate mb-2 sm:mb-3">
          {user.email}
        </p>
        <p
          className="text-sm sm:text-lg font-bold"
          style={{ color: isFirst ? accentColor : undefined }}
        >
          {formatCurrency(user.revenue)}
        </p>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">
          {user.sales} vendas
        </p>
      </div>
    </div>
  )
}

function RankRow({ user, isMe }: { user: RankedUser; isMe: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 sm:gap-4 px-4 py-3 transition-colors",
        isMe ? "bg-accent/5" : "hover:bg-muted/50"
      )}
    >
      <div className="w-8 flex items-center justify-center">
        <span className="text-sm font-bold text-muted-foreground">{user.position}</span>
      </div>
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-accent/10 flex items-center justify-center text-sm font-bold text-accent shrink-0">
        {getInitial(user)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">
          {displayName(user)}
          {isMe && <span className="text-accent"> (voce)</span>}
        </p>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-foreground">{formatCurrency(user.revenue)}</p>
        <p className="text-[11px] text-muted-foreground">{user.sales} vendas</p>
      </div>
    </div>
  )
}
