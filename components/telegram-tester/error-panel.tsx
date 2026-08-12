"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, ChevronDown, ChevronRight, Copy, Check, RefreshCw, Loader2, Trash2 } from "lucide-react"

interface DebugLog {
  id: string | number
  level: string
  category: string
  message: string
  data?: Record<string, unknown> | null
  telegram_user_id?: string | null
  bot_id?: string | null
  flow_id?: string | null
  created_at: string
}

interface ErrorPanelProps {
  /** Sempre que este valor mudar, o painel recarrega os erros do banco. */
  refreshKey: number
  /** Filtra os erros por bot (opcional). */
  botId?: string
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  } catch {
    return iso
  }
}

export function ErrorPanel({ refreshKey, botId }: ErrorPanelProps) {
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string | number>>(new Set())
  const [copied, setCopied] = useState(false)
  const [clearing, setClearing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch(`/api/debug/logs?source=database&level=error&limit=50`)
      const data = await res.json()
      if (!data.success) {
        setFetchError(data.details || data.error || "Erro ao carregar logs")
        setLogs([])
        return
      }
      let list: DebugLog[] = data.logs || []
      if (botId) list = list.filter((l) => !l.bot_id || l.bot_id === botId)
      setLogs(list)
    } catch (err) {
      setFetchError(String(err))
    } finally {
      setLoading(false)
    }
  }, [botId])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  const toggle = (id: string | number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyAll = async () => {
    const text = logs
      .map((l) => {
        const parts = [
          `[${formatDate(l.created_at)}] (${l.category}) ${l.message}`,
          l.bot_id ? `bot_id: ${l.bot_id}` : "",
          l.flow_id ? `flow_id: ${l.flow_id}` : "",
          l.data && Object.keys(l.data).length ? `data: ${JSON.stringify(l.data)}` : "",
        ].filter(Boolean)
        return parts.join("\n")
      })
      .join("\n\n---\n\n")
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const clearOld = async () => {
    setClearing(true)
    try {
      await fetch(`/api/debug/logs?source=database`, { method: "DELETE" })
      await load()
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h2 className="text-sm font-semibold">Erros registrados</h2>
          {logs.length > 0 && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
              {logs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={copyAll}
            disabled={logs.length === 0}
            title="Copiar todos os erros"
            className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-40"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            title="Recarregar"
            className="flex items-center justify-center rounded-md border border-border bg-background p-1.5 transition-colors hover:bg-muted disabled:opacity-40"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={clearOld}
            disabled={clearing}
            title="Limpar erros com mais de 7 dias"
            className="flex items-center justify-center rounded-md border border-border bg-background p-1.5 transition-colors hover:bg-muted disabled:opacity-40"
          >
            {clearing ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-pretty">
        Todos os erros do bot (PIX, fluxo, webhook, pagamento) ficam salvos aqui no banco. Copie e me envie
        para eu resolver.
      </p>

      {fetchError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{fetchError}</p>
      )}

      {!fetchError && logs.length === 0 && !loading && (
        <p className="rounded-md bg-muted px-3 py-4 text-center text-xs text-muted-foreground">
          Nenhum erro registrado. Rode o fluxo para gerar e capturar erros.
        </p>
      )}

      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
        {logs.map((log) => {
          const isOpen = expanded.has(log.id)
          const hasData = log.data && Object.keys(log.data).length > 0
          return (
            <div key={log.id} className="rounded-md border border-destructive/30 bg-destructive/5">
              <button
                type="button"
                onClick={() => hasData && toggle(log.id)}
                className="flex w-full items-start gap-2 p-3 text-left"
              >
                {hasData ? (
                  isOpen ? (
                    <ChevronDown className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  )
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">
                      {log.category}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(log.created_at)}</span>
                  </div>
                  <p className="mt-1 break-words text-xs text-foreground">{log.message}</p>
                </div>
              </button>
              {isOpen && hasData && (
                <pre className="mx-3 mb-3 max-h-48 overflow-auto rounded bg-background p-2 text-[10px] leading-relaxed text-muted-foreground">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
