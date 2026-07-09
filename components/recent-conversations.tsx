"use client"

import { useState } from "react"
import useSWR from "swr"
import { MessageSquare, Clock, List, User, ChevronDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ChatDialog } from "@/components/chat/chat-dialog"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface Conversation {
  id: string
  nome: string
  telegram: string
  telegramUserId: string
  telegramChatId: string
  mensagens: number
  status: string
  statusLabel: string
  tempoResposta: string
  resultado: string
  resultadoTipo: string
  fluxo: string | null
  iniciadoEm: string
  ultimaAtividade: string
}

// Componente reutilizavel da tabela de Conversas Recentes.
// Usa tokens de tema por padrao (dashboard escura). Passar `light` para
// combinar com paginas de fundo claro (ex: Clientes).
export function RecentConversations({ botId, light = false }: { botId?: string; light?: boolean }) {
  const [tablePeriod, setTablePeriod] = useState("month")
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null)

  const { data, isLoading } = useSWR<{ conversations: Conversation[]; total: number }>(
    botId ? `/api/conversations?bot_id=${botId}&period=${tablePeriod}` : null,
    fetcher,
    { refreshInterval: 30000 },
  )

  const conversations = data?.conversations || []

  // Classes condicionais por variante de tema
  const c = light
    ? {
        card: "bg-white rounded-xl p-6 shadow-sm border border-gray-200",
        iconBox: "bg-gray-100",
        icon: "text-gray-700",
        title: "text-gray-900",
        selectBtn: "text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100",
        headRow: "text-gray-500 border-gray-200",
        rowBorder: "border-gray-100",
        rowHover: "hover:bg-gray-50",
        avatar: "bg-gray-100",
        avatarIcon: "text-gray-700",
        name: "text-gray-900",
        sub: "text-gray-500",
        muted: "text-gray-500",
        chip: "bg-gray-100 text-gray-600",
        empty: "text-gray-500",
      }
    : {
        card: "bg-card rounded-3xl p-6 shadow-sm border border-border",
        iconBox: "bg-secondary",
        icon: "text-foreground",
        title: "text-foreground",
        selectBtn: "text-muted-foreground bg-secondary border-border hover:bg-muted",
        headRow: "text-muted-foreground border-border",
        rowBorder: "border-border/50",
        rowHover: "hover:bg-muted/30",
        avatar: "bg-secondary",
        avatarIcon: "text-foreground",
        name: "text-foreground",
        sub: "text-muted-foreground",
        muted: "text-muted-foreground",
        chip: "bg-muted text-muted-foreground",
        empty: "text-muted-foreground",
      }

  return (
    <div className={c.card}>
      <div className="flex flex-row justify-between items-center mb-6 gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.iconBox}`}>
            <List size={16} className={c.icon} />
          </div>
          <h3 className={`font-semibold text-lg ${c.title}`}>Conversas Recentes</h3>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${c.selectBtn}`}>
              {tablePeriod === "week" ? "Semana" : tablePeriod === "month" ? "Mês" : "Ano"}
              <ChevronDown size={14} />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-32 p-2" align="end">
            <div className="flex flex-col gap-1">
              {[
                { label: "Semana", value: "week" },
                { label: "Mês", value: "month" },
                { label: "Ano", value: "year" },
              ].map((p) => (
                <button
                  key={p.value}
                  onClick={() => setTablePeriod(p.value)}
                  className={`px-3 py-1.5 rounded text-xs text-left transition-colors ${
                    tablePeriod === p.value
                      ? "bg-secondary text-foreground font-medium"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className={`text-xs border-b ${c.headRow}`}>
              <th className="pb-3 font-medium px-2">Usuário</th>
              <th className="pb-3 font-medium px-2">Mensagens</th>
              <th className="pb-3 font-medium px-2">Status</th>
              <th className="pb-3 font-medium px-2">Tempo de Resposta</th>
              <th className="pb-3 font-medium px-2">Resultado</th>
              <th className="pb-3 font-medium px-2 text-right">Ação</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className={`py-8 text-center text-sm ${c.empty}`}>
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Carregando conversas...
                  </div>
                </td>
              </tr>
            ) : conversations.length === 0 ? (
              <tr>
                <td colSpan={6} className={`py-8 text-center text-sm ${c.empty}`}>
                  Nenhuma conversa registrada ainda
                </td>
              </tr>
            ) : (
              conversations.map((conv) => (
                <tr
                  key={conv.id}
                  className={`border-b transition-colors cursor-pointer ${c.rowBorder} ${c.rowHover}`}
                  onClick={() => {
                    setSelectedChatUserId(conv.telegramUserId)
                    setChatOpen(true)
                  }}
                >
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${c.avatar}`}>
                        <User size={16} className={c.avatarIcon} />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${c.name}`}>{conv.nome}</span>
                        <span className={`text-xs ${c.sub}`}>{conv.telegram}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={14} className={c.muted} />
                      <span className={`text-sm ${c.name}`}>{conv.mensagens}</span>
                      {conv.fluxo && (
                        <span className={`text-xs px-2 py-0.5 rounded-full truncate max-w-[100px] ${c.chip}`}>
                          {conv.fluxo}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        conv.status === "ativo"
                          ? "bg-green-500/20 text-green-500"
                          : conv.status === "aguardando"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : conv.status === "concluido"
                              ? "bg-blue-500/20 text-blue-500"
                              : c.chip
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          conv.status === "ativo"
                            ? "bg-green-500"
                            : conv.status === "aguardando"
                              ? "bg-yellow-500"
                              : conv.status === "concluido"
                                ? "bg-blue-500"
                                : "bg-muted-foreground"
                        }`}
                      />
                      {conv.statusLabel}
                    </span>
                  </td>
                  <td className="py-4 px-2">
                    <div className={`flex items-center gap-1.5 text-sm ${c.muted}`}>
                      <Clock size={14} />
                      {conv.tempoResposta}
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <span
                      className={`text-sm font-medium ${
                        conv.resultadoTipo === "positivo"
                          ? "text-green-500"
                          : conv.resultadoTipo === "negativo"
                            ? "text-red-500"
                            : c.muted
                      }`}
                    >
                      {conv.resultado}
                    </span>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedChatUserId(conv.telegramUserId)
                        setChatOpen(true)
                      }}
                      className="gap-1.5"
                    >
                      <MessageSquare size={14} />
                      Abrir Chat
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        botId={botId}
        initialUserId={selectedChatUserId || undefined}
      />
    </div>
  )
}
