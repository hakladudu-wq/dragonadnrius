"use client"

import { useEffect, useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import {
  Crown,
  Trophy,
  Medal,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingBag,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react"

interface RankedUser {
  id: string
  email: string
  name: string | null
  created_at: string
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
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function getInitial(user: RankedUser) {
  return (user.name || user.email || "?").charAt(0).toUpperCase()
}

function displayName(user: RankedUser) {
  return user.name || user.email?.split("@")[0] || "Sem nome"
}

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankedUser[]>([])
  const [summary, setSummary] = useState<RankingSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  const loadRanking = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log("[v0] Ranking page - fetching ranking...")
      const res = await fetch("/api/dragonadm/ranking")
      if (res.ok) {
        const data = await res.json()
        console.log("[v0] Ranking page - received:", data.ranking?.length)
        setRanking(data.ranking || [])
        setSummary(data.summary || null)
      } else {
        console.error("[v0] Ranking page - API error:", await res.text())
      }
    } catch (error) {
      console.error("[v0] Ranking page - erro:", error)
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

  // Ordem visual do podio: 2 lugar, 1 lugar (centro/maior), 3 lugar
  const podiumOrder = [topThree[1], topThree[0], topThree[2]].filter(Boolean)

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl bg-[#BFFF00] flex items-center justify-center">
            <Crown className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Ranking de Usuarios</h1>
            <p className="text-sm text-zinc-500">Quem mais fatura na plataforma</p>
          </div>
        </div>
        <button
          onClick={loadRanking}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-white/5 disabled:opacity-50 transition-all self-start"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Atualizar
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-[#111] border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#BFFF00]/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-[#BFFF00]" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Faturamento total</p>
              <p className="text-lg font-bold text-white">
                {formatCurrency(summary?.totalRevenue || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-[#111] border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#BFFF00]/10 flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-[#BFFF00]" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Vendas totais</p>
              <p className="text-lg font-bold text-white">{summary?.totalSales || 0}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-[#111] border border-white/5 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#BFFF00]/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-[#BFFF00]" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Vendedores ativos</p>
              <p className="text-lg font-bold text-white">{summary?.totalUsers || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-7 h-7 text-[#BFFF00] animate-spin" />
        </div>
      ) : ranking.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-xl bg-[#111] border border-white/5">
          <Trophy className="h-12 w-12 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">Nenhuma venda registrada ainda</p>
        </div>
      ) : (
        <>
          {/* Podio Top 3 */}
          <div className="grid grid-cols-3 gap-3 sm:gap-5 items-end">
            {podiumOrder.map((user) => (
              <PodiumCard key={user.id} user={user} />
            ))}
          </div>

          {/* Lista dos demais */}
          {ranking.length > 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#BFFF00]" />
                  Demais colocados
                </h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                  <input
                    placeholder="Buscar usuario..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full sm:w-72 pl-10 pr-4 py-2.5 rounded-lg text-sm text-white placeholder:text-zinc-600 bg-[#111] border border-white/5 focus:outline-none focus:border-[#BFFF00]/30 transition-all"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[#111] border border-white/5 overflow-hidden divide-y divide-white/5">
                {rest.map((user) => (
                  <RankRow key={user.id} user={user} />
                ))}
                {rest.length === 0 && (
                  <div className="py-10 text-center text-sm text-zinc-600">
                    Nenhum resultado
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function PodiumCard({ user }: { user: RankedUser }) {
  const isFirst = user.position === 1
  const isSecond = user.position === 2

  const styles = isFirst
    ? {
        accent: "#FFD700",
        ring: "ring-2 ring-[#FFD700]",
        bg: "bg-gradient-to-b from-[#FFD700]/15 to-[#111]",
        border: "border-[#FFD700]/40",
        height: "pt-2",
      }
    : isSecond
    ? {
        accent: "#cbd5e1",
        ring: "ring-1 ring-zinc-400/40",
        bg: "bg-[#111]",
        border: "border-white/10",
        height: "pt-6",
      }
    : {
        accent: "#d97706",
        ring: "ring-1 ring-amber-700/40",
        bg: "bg-[#111]",
        border: "border-white/10",
        height: "pt-6",
      }

  return (
    <div className={cn("flex flex-col items-center", styles.height)}>
      {/* Avatar com coroa no top 1 */}
      <div className="relative mb-3">
        {isFirst && (
          <Crown
            className="absolute -top-5 left-1/2 -translate-x-1/2 h-7 w-7 drop-shadow"
            style={{ color: styles.accent }}
            fill={styles.accent}
          />
        )}
        <div
          className={cn(
            "rounded-2xl flex items-center justify-center font-bold text-black",
            styles.ring,
            isFirst ? "w-20 h-20 text-2xl" : "w-16 h-16 text-xl"
          )}
          style={{ background: styles.accent }}
        >
          {getInitial(user)}
        </div>
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-[#0a0a0a]"
          style={{ background: styles.accent }}
        >
          {user.position}
        </div>
      </div>

      <div
        className={cn(
          "w-full rounded-xl border p-4 text-center",
          styles.bg,
          styles.border
        )}
      >
        <p className="text-sm font-semibold text-white truncate" title={displayName(user)}>
          {displayName(user)}
        </p>
        <p className="text-[11px] text-zinc-500 truncate mb-3">{user.email}</p>
        <p
          className="text-base sm:text-lg font-bold"
          style={{ color: isFirst ? styles.accent : "#fff" }}
        >
          {formatCurrency(user.revenue)}
        </p>
        <p className="text-[11px] text-zinc-500 mt-0.5">{user.sales} vendas</p>
      </div>
    </div>
  )
}

function RankRow({ user }: { user: RankedUser }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.02] transition-colors">
      <div className="w-8 flex items-center justify-center">
        <span className="text-sm font-bold text-zinc-500">{user.position}</span>
      </div>
      <div className="w-10 h-10 rounded-lg bg-[#BFFF00]/10 flex items-center justify-center text-sm font-bold text-[#BFFF00] shrink-0">
        {getInitial(user)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate">{displayName(user)}</p>
        <p className="text-xs text-zinc-600 truncate">{user.email}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-white">{formatCurrency(user.revenue)}</p>
        <p className="text-[11px] text-zinc-600">{user.sales} vendas</p>
      </div>
    </div>
  )
}
