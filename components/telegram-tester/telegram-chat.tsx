"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Copy, Send } from "lucide-react"

export interface ChatItem {
  id: string
  role: "bot" | "user"
  kind: "text" | "photo" | "video" | "edit"
  text?: string
  mediaUrl?: string
  buttons?: { text: string; callback_data?: string; url?: string }[][]
  messageId?: number
}

// Renderiza apenas um subconjunto seguro de HTML que o Telegram aceita.
function renderTelegramHtml(raw: string): string {
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
  // Reabilita apenas tags permitidas
  return escaped
    .replace(/&lt;(\/?)(b|strong|i|em|u|s|code|pre)&gt;/gi, "<$1$2>")
    .replace(/\n/g, "<br/>")
}

function looksLikePix(text: string): string | null {
  // Codigo copia-e-cola do PIX costuma ser longo e conter "BR.GOV.BCB.PIX" ou 0002...
  const match = text.match(/[0-9A-Za-z.]{0,40}BR\.GOV\.BCB\.PIX[\s\S]{20,}/i)
  if (match) return match[0].replace(/\s+/g, "")
  const long = text.match(/000201[\s\S]{40,}/)
  if (long) return long[0].replace(/\s+/g, "")
  return null
}

function CopyPix({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(code).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
      }}
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "PIX copiado" : "Copiar codigo PIX"}
    </button>
  )
}

function Bubble({ item, onButton }: { item: ChatItem; onButton: (data: string) => void }) {
  const isBot = item.role === "bot"
  const pix = item.text ? looksLikePix(item.text) : null
  return (
    <div className={`flex w-full ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
          isBot
            ? "rounded-tl-sm bg-card text-card-foreground"
            : "rounded-tr-sm bg-accent text-accent-foreground"
        }`}
      >
        {item.mediaUrl && item.kind === "photo" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.mediaUrl || "/placeholder.svg"}
            alt="Midia enviada pelo bot"
            crossOrigin="anonymous"
            className="mb-2 max-h-64 w-full rounded-lg object-contain"
          />
        )}
        {item.mediaUrl && item.kind === "video" && (
          <video src={item.mediaUrl} controls className="mb-2 max-h-64 w-full rounded-lg" />
        )}
        {item.text && (
          <div
            className="break-words [word-break:break-word]"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: renderTelegramHtml(item.text) }}
          />
        )}
        {pix && <CopyPix code={pix} />}
        {item.buttons && item.buttons.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {item.buttons.map((row, ri) => (
              <div key={ri} className="flex gap-1.5">
                {row.map((btn, bi) => {
                  if (btn.url) {
                    return (
                      <a
                        key={bi}
                        href={btn.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-md bg-secondary px-3 py-2 text-center text-xs font-medium text-secondary-foreground transition-colors hover:bg-muted"
                      >
                        {btn.text}
                      </a>
                    )
                  }
                  return (
                    <button
                      key={bi}
                      type="button"
                      onClick={() => btn.callback_data && onButton(btn.callback_data)}
                      className="flex-1 rounded-md bg-secondary px-3 py-2 text-center text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      {btn.text}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface TelegramChatProps {
  items: ChatItem[]
  loading: boolean
  disabled: boolean
  onSendText: (text: string) => void
  onButton: (data: string) => void
}

export function TelegramChat({ items, loading, disabled, onSendText, onButton }: TelegramChatProps) {
  const [text, setText] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [items, loading])

  const submit = () => {
    const t = text.trim()
    if (!t || disabled) return
    onSendText(t)
    setText("")
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
          B
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">Simulacao do Bot</p>
          <p className="truncate text-xs text-muted-foreground">motor real - sem enviar ao Telegram</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
        {items.length === 0 && !loading && (
          <p className="m-auto text-center text-sm text-muted-foreground text-pretty">
            Selecione um bot e um fluxo, depois clique em Iniciar para comecar a simular.
          </p>
        )}
        {items.map((item) => (
          <Bubble key={item.id} item={item} onButton={onButton} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl rounded-tl-sm bg-card px-4 py-3">
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-card p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              submit()
            }
          }}
          disabled={disabled}
          placeholder={disabled ? "Inicie uma simulacao" : "Digite uma mensagem..."}
          className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !text.trim()}
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          aria-label="Enviar mensagem"
        >
          <Send className="size-5" />
        </button>
      </div>
    </div>
  )
}
