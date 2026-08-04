"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Play, RotateCcw, Loader2 } from "lucide-react"
import { TelegramChat, type ChatItem } from "@/components/telegram-tester/telegram-chat"
import { ErrorLogPanel } from "@/components/telegram-tester/error-log-panel"
import type { CapturedMessage } from "@/lib/telegram-simulation"

interface BotOption {
  id: string
  name: string
  status: string | null
  hasToken: boolean
  flows: { id: string; name: string; status: string | null }[]
}

interface Session {
  userId: number
  chatId: number
  lastMessageId: number
}

function newSession(): Session {
  const id = Math.floor(100_000_000 + Math.random() * 800_000_000)
  return { userId: id, chatId: id, lastMessageId: 1 }
}

export default function TelegramTesterPage() {
  const [apiKey, setApiKey] = useState("")
  const [bots, setBots] = useState<BotOption[]>([])
  const [loadingBots, setLoadingBots] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const [selectedBotId, setSelectedBotId] = useState("")
  const [selectedFlowId, setSelectedFlowId] = useState("")

  const [items, setItems] = useState<ChatItem[]>([])
  const [running, setRunning] = useState(false)
  const [started, setStarted] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const sessionRef = useRef<Session>(newSession())

  // Le a chave da URL (?key=...) na primeira renderizacao
  useEffect(() => {
    const url = new URL(window.location.href)
    const k = url.searchParams.get("key") || ""
    setApiKey(k)
  }, [])

  const loadBots = useCallback(async (key: string) => {
    setLoadingBots(true)
    setAuthError(null)
    try {
      const res = await fetch(`/api/telegram-tester?key=${encodeURIComponent(key)}`)
      const data = await res.json()
      if (!res.ok) {
        setAuthError(data.error || "Erro ao carregar bots")
        setBots([])
        return
      }
      setBots(data.bots || [])
    } catch (err) {
      setAuthError(String(err))
    } finally {
      setLoadingBots(false)
    }
  }, [])

  useEffect(() => {
    loadBots(apiKey)
  }, [apiKey, loadBots])

  const selectedBot = useMemo(() => bots.find((b) => b.id === selectedBotId), [bots, selectedBotId])

  // Ajusta o fluxo selecionado ao trocar de bot
  useEffect(() => {
    if (!selectedBot) {
      setSelectedFlowId("")
      return
    }
    if (selectedBot.flows.length > 0) {
      setSelectedFlowId((prev) =>
        selectedBot.flows.some((f) => f.id === prev) ? prev : selectedBot.flows[0].id,
      )
    } else {
      setSelectedFlowId("")
    }
  }, [selectedBot])

  const applyCaptures = useCallback((captures: CapturedMessage[]) => {
    setItems((prev) => {
      const next = [...prev]
      for (const c of captures) {
        if (c.kind === "edit" && c.messageId != null) {
          const idx = [...next].reverse().findIndex((i) => i.messageId === c.messageId && i.role === "bot")
          if (idx !== -1) {
            const realIdx = next.length - 1 - idx
            next[realIdx] = { ...next[realIdx], text: c.text, buttons: c.buttons }
            continue
          }
        }
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role: "bot",
          kind: c.kind,
          text: c.text,
          mediaUrl: c.mediaUrl,
          buttons: c.buttons,
          messageId: c.messageId,
        })
      }
      // Guarda o ultimo message_id do bot para os callbacks
      const lastBot = [...next].reverse().find((i) => i.role === "bot" && i.messageId != null)
      if (lastBot?.messageId != null) sessionRef.current.lastMessageId = lastBot.messageId
      return next
    })
  }, [])

  const run = useCallback(
    async (payload: { action: "start" | "callback" | "text"; callbackData?: string; text?: string }) => {
      if (!selectedBotId) return
      setRunning(true)
      setRunError(null)
      try {
        const res = await fetch("/api/telegram-tester", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: apiKey,
            botId: selectedBotId,
            flowId: selectedFlowId || undefined,
            action: payload.action,
            callbackData: payload.callbackData,
            text: payload.text,
            session: {
              userId: sessionRef.current.userId,
              chatId: sessionRef.current.chatId,
              lastMessageId: sessionRef.current.lastMessageId,
            },
          }),
        })
        const data = await res.json()
        if (!res.ok) {
          setRunError(data.error || "Erro ao rodar o fluxo")
          return
        }
        applyCaptures(data.captures || [])
      } catch (err) {
        setRunError(String(err))
      } finally {
        setRunning(false)
      }
    },
    [apiKey, selectedBotId, selectedFlowId, applyCaptures],
  )

  const handleStart = () => {
    sessionRef.current = newSession()
    setItems([])
    setStarted(true)
    setRunError(null)
    run({ action: "start" })
  }

  const handleReset = () => {
    sessionRef.current = newSession()
    setItems([])
    setStarted(false)
    setRunError(null)
  }

  const handleSendText = (text: string) => {
    setItems((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", kind: "text", text },
    ])
    run({ action: "text", text })
  }

  const handleButton = (data: string) => {
    run({ action: "callback", callbackData: data })
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
        <header className="text-center">
          <h1 className="text-xl font-bold text-balance">Testador de Fluxos</h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Roda o motor real do bot em modo simulacao. O PIX e gerado de verdade, mas nada e enviado ao
            Telegram.
          </p>
        </header>

        {/* Chave (quando exigida) */}
        {authError && (
          <div className="rounded-lg border border-border bg-card p-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="key">
              Chave de acesso
            </label>
            <input
              id="key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua chave secreta"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-2 text-xs text-destructive">{authError}</p>
          </div>
        )}

        {/* Seletores */}
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="bot">
              Bot
            </label>
            <select
              id="bot"
              value={selectedBotId}
              onChange={(e) => setSelectedBotId(e.target.value)}
              disabled={loadingBots}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              <option value="">{loadingBots ? "Carregando..." : "Selecione um bot"}</option>
              {bots.map((b) => (
                <option key={b.id} value={b.id} disabled={!b.hasToken}>
                  {b.name}
  
                  {b.hasToken ? "" : " - sem token"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="flow">
              Fluxo
            </label>
            <select
              id="flow"
              value={selectedFlowId}
              onChange={(e) => setSelectedFlowId(e.target.value)}
              disabled={!selectedBot || selectedBot.flows.length === 0}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
            >
              {!selectedBot && <option value="">Selecione um bot primeiro</option>}
              {selectedBot && selectedBot.flows.length === 0 && (
                <option value="">Fluxo ativo do bot (padrao)</option>
              )}
              {selectedBot?.flows.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.status ? ` - ${f.status}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleStart}
              disabled={!selectedBotId || running}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {running && !started ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              {started ? "Reiniciar" : "Iniciar"}
            </button>
            {started && (
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                <RotateCcw className="size-4" />
                Limpar
              </button>
            )}
          </div>
          {runError && <p className="text-xs text-destructive">{runError}</p>}
        </div>

        {/* Log de erros (PIX, gateway, simulacao) */}
        <ErrorLogPanel />

        {/* Chat */}
        <div className="min-h-0 flex-1">
          <div className="h-[600px]">
            <TelegramChat
              items={items}
              loading={running}
              disabled={!started || running}
              onSendText={handleSendText}
              onButton={handleButton}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
