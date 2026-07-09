"use client"

import useSWR from "swr"
import { Activity, Zap, UserPlus, CheckCircle2 } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ActivityEvent {
  id: string
  type: "novo_lead" | "pix_gerado" | "pagamento"
  name: string
  description: string
  amount: number | null
  timestamp: string
}

// Formata o tempo relativo (ex: "1h", "5h", "2d")
function timeAgo(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = Math.max(0, now - then)
  const mins = Math.floor(diffMs / 60000)
  const hours = Math.floor(diffMs / 3600000)
  const days = Math.floor(diffMs / 86400000)
  if (mins < 1) return "agora"
  if (mins < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  return `${days}d`
}

function formatStamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const typeConfig = {
  novo_lead: {
    label: "Novo Lead",
    icon: UserPlus,
    className: "bg-blue-500/15 text-blue-400",
  },
  pix_gerado: {
    label: "PIX Gerado",
    icon: Zap,
    className: "bg-amber-500/15 text-amber-400",
  },
  pagamento: {
    label: "Pagamento",
    icon: CheckCircle2,
    className: "bg-green-500/15 text-green-400",
  },
}

export function DashboardActivityLog({ botId }: { botId?: string }) {
  const { data, isLoading } = useSWR<{ events: ActivityEvent[] }>(
    botId ? `/api/activity?bot_id=${botId}&limit=25` : null,
    fetcher,
    { refreshInterval: 8000 }, // atualiza a cada 8s (tempo real)
  )

  const events = data?.events || []

  return (
    <div className="bg-card rounded-3xl p-6 shadow-sm border border-border flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Activity size={18} className="text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground leading-tight">Log de Atividades</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
            <span className="text-[11px] font-medium tracking-widest uppercase text-muted-foreground">
              Tempo real
            </span>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2 max-h-[420px]">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Carregando...
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Activity className="h-9 w-9 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade ainda</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Os eventos aparecerão aqui em tempo real
            </p>
          </div>
        ) : (
          events.map((ev) => {
            const cfg = typeConfig[ev.type]
            const Icon = cfg.icon
            return (
              <div
                key={ev.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-secondary/50 border border-border/50 hover:bg-secondary transition-colors"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.className}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">{cfg.label}</span>
                    <span className="text-xs font-medium text-muted-foreground flex-shrink-0">{timeAgo(ev.timestamp)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground truncate">
                      {ev.name} - {ev.description}
                    </p>
                    <span className="text-[10px] text-muted-foreground/70 flex-shrink-0">{formatStamp(ev.timestamp)}</span>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
