"use client"

import { useState } from "react"
import useSWR from "swr"
import { Trophy, Lock, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Placas/premiacoes por meta de faturamento
const premiacoes = [
  {
    id: 1,
    titulo: "Caneca + Pulseira",
    pontosNum: 10000,
    plaquinha:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-TMhkBoA48JSpENaJVFkZRyrrQ2Y5JZ.png",
  },
  {
    id: 2,
    titulo: "Kit Premium",
    pontosNum: 100000,
    plaquinha:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Zjc1SF7AR4QiHPCSItIilGEKhwR6Uz.png",
  },
  {
    id: 3,
    titulo: "Experiencia VIP",
    pontosNum: 500000,
    plaquinha:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-lh6iqRrOeYyMAq0IC6x8spZMt6dENP.png",
  },
  {
    id: 4,
    titulo: "Parceria Oficial",
    pontosNum: 1000000,
    plaquinha:
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-E1Izb9ktpBbqZlZTcVf6kpy6MAbafF.png",
  },
]

// Formata valores compactos: 10000 -> "R$ 10k", 1000000 -> "R$ 1M"
function formatCompact(value: number) {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}k`
  return `R$ ${value.toFixed(0)}`
}

export function DashboardRewards() {
  const { session } = useAuth()
  const [activeIndex, setActiveIndex] = useState(0)

  const { data } = useSWR<{ totalRevenue: number }>(
    session?.userId ? `/api/user/revenue?userId=${session.userId}` : null,
    fetcher,
    { refreshInterval: 60000 },
  )

  const faturamentoAtual = data?.totalRevenue || 0
  const premio = premiacoes[activeIndex]
  const isDesbloqueado = faturamentoAtual >= premio.pontosNum
  const progressPercent = Math.min((faturamentoAtual / premio.pontosNum) * 100, 100)

  return (
    <div className="bg-card rounded-[24px] p-5 shadow-sm border border-border flex flex-col h-full">
      {/* Cabecalho */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 flex items-center justify-center shrink-0">
            <Trophy className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h3 className="font-bold text-foreground leading-tight">Premiações</h3>
            <p className="text-[10px] font-medium tracking-[0.15em] text-muted-foreground uppercase">
              Conquiste novas placas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Placa anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setActiveIndex((i) => Math.min(premiacoes.length - 1, i + 1))}
            disabled={activeIndex === premiacoes.length - 1}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Próxima placa"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Card da placa */}
      <div className="flex-1 flex flex-col">
        <div className="relative flex-1 min-h-[240px] rounded-2xl overflow-hidden bg-secondary/50 border border-border/50">
          <img
            src={premio.plaquinha || "/placeholder.svg"}
            alt={premio.titulo}
            crossOrigin="anonymous"
            className={`w-full h-full object-cover transition-all duration-500 ${
              !isDesbloqueado ? "opacity-70 grayscale" : ""
            }`}
          />

          {/* Overlay de bloqueio */}
          {!isDesbloqueado && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/30">
              <div className="w-14 h-14 rounded-full bg-background/70 backdrop-blur-sm flex items-center justify-center border border-border">
                <Lock className="w-6 h-6 text-muted-foreground" />
              </div>
            </div>
          )}

          {/* Gradiente + info na base */}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background via-background/80 to-transparent">
            <h4 className="text-lg font-bold text-foreground text-balance">{premio.titulo}</h4>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] font-bold tracking-widest uppercase text-rose-400">Meta</span>
              <span className="text-sm font-bold text-foreground">
                {formatCompact(faturamentoAtual)}{" "}
                <span className="text-muted-foreground">/ {formatCompact(premio.pontosNum)}</span>
              </span>
            </div>
            {/* Barra de progresso */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-rose-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Indicador de paginas */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {premiacoes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === activeIndex ? "w-6 bg-rose-500" : "w-1.5 bg-muted hover:bg-muted-foreground/50"
              }`}
              aria-label={`Ir para placa ${idx + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
