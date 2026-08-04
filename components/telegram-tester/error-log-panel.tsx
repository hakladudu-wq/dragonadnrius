"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Check, ChevronDown, ChevronUp, Loader2, RefreshCw, Trash2 } from "lucide-react"

interface ErrorLog {
  id: string
  created_at: string
  source: string
  context: string | null
  message: string
  details: Record<string, unknown> | null
  resolved: boolean
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

function ErrorRow({
  log,
  onResolve,
  onDelete,
}: {
  log: ErrorLog
  onResolve: (id: string, resolved: boolean) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const hasDetails = log.details && Object.keys(log.details).length > 0

  return (
    <li
      className={`rounded-lg border p-3 text-xs ${
        log.resolved ? "border-border bg-muted/40 opacity-60" : "border-destructive/40 bg-destructive/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground">
              {log.source}
            </span>
            <span className="text-[10px] text-muted-foreground">{formatDate(log.created_at)}</span>
            {log.resolved && (
              <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                resolvido
              </span>
            )}
          </div>
          <p className="break-words font-medium text-foreground [word-break:break-word]">{log.message}</p>
          {log.context && <p className="mt-0.5 break-words text-muted-foreground">{log.context}</p>}
          {hasDetails && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              {open ? "Ocultar detalhes" : "Ver detalhes"}
            </button>
          )}
          {open && hasDetails && (
            <pre className="mt-1 max-h-48 overflow-auto rounded bg-background p-2 text-[10px] leading-relaxed text-muted-foreground">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={() => onResolve(log.id, !log.resolved)}
            title={log.resolved ? "Marcar como pendente" : "Marcar como resolvido"}
            className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(log.id)}
            title="Apagar erro"
            className="flex size-7 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </li>
  )
}

export function ErrorLogPanel() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [loading, setLoading] = useState(false)
  const [unresolved, setUnresolved] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch("/api/error-logs?limit=100", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        setFetchError(data.error || "Erro ao carregar")
        return
      }
      setLogs(data.errors || [])
      setUnresolved(data.unresolved || 0)
    } catch (err) {
      setFetchError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleResolve = async (id: string, resolved: boolean) => {
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, resolved } : l)))
    setUnresolved((prev) => (resolved ? Math.max(0, prev - 1) : prev + 1))
    await fetch("/api/error-logs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, resolved }),
    })
  }

  const handleDelete = async (id: string) => {
    const target = logs.find((l) => l.id === id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
    if (target && !target.resolved) setUnresolved((prev) => Math.max(0, prev - 1))
    await fetch(`/api/error-logs?id=${encodeURIComponent(id)}`, { method: "DELETE" })
  }

  const handleClearAll = async () => {
    if (!confirm("Apagar TODOS os erros registrados?")) return
    setLogs([])
    setUnresolved(0)
    await fetch("/api/error-logs?all=1", { method: "DELETE" })
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`size-4 ${unresolved > 0 ? "text-destructive" : "text-muted-foreground"}`} />
          <span className="text-sm font-semibold text-foreground">Log de erros</span>
          {unresolved > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
              {unresolved}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              Atualizar
            </button>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
                Limpar tudo
              </button>
            )}
          </div>

          {fetchError && (
            <p className="mb-2 text-xs text-destructive">
              {fetchError} - verifique se a tabela error_logs foi criada no banco.
            </p>
          )}

          {logs.length === 0 && !loading && !fetchError && (
            <p className="py-4 text-center text-xs text-muted-foreground">Nenhum erro registrado.</p>
          )}

          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {logs.map((log) => (
              <ErrorRow key={log.id} log={log} onResolve={handleResolve} onDelete={handleDelete} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
