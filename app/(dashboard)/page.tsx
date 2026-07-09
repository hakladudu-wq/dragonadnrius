"use client"

import { useState } from "react"
import useSWR from "swr"
import {
  Search,
  ChevronDown,
  Plus,
  Check,
  Bot,
  MessageSquare,
  Clock,
  List,
  User,
  DollarSign,
  TrendingUp,
  Zap,
  Receipt,
} from "lucide-react"
import Link from "next/link"
import { useBots } from "@/lib/bot-context"
import { useAuth } from "@/lib/auth-context"
import { NoBotSelected } from "@/components/no-bot-selected"
import { DashboardRanking } from "@/components/dashboard-ranking"
import { DashboardPerformanceChart } from "@/components/dashboard-performance-chart"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ChatDialog } from "@/components/chat/chat-dialog"

// Presets de periodo (simples, como a referencia)
const periodOptions = [
  { label: "Hoje", value: "today" },
  { label: "Ontem", value: "yesterday" },
  { label: "7 dias", value: "7days" },
  { label: "30 dias", value: "30days" },
  { label: "Total", value: "total" },
]

// Fetcher para SWR
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

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Medidor semicircular simples para a taxa de conversao
function Gauge({ value }: { value: number }) {
  const length = Math.PI * 50 // comprimento do semicirculo (r = 50)
  const clamped = Math.max(0, Math.min(100, value))
  const offset = length * (1 - clamped / 100)

  return (
    <div className="relative w-full flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-40 h-24">
        <path
          d="M10,60 A50,50 0 0 1 110,60"
          fill="none"
          className="stroke-muted"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M10,60 A50,50 0 0 1 110,60"
          fill="none"
          className="stroke-primary transition-all duration-500"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute bottom-0 text-2xl font-bold text-foreground">
        {clamped.toFixed(0)}%
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const { selectedBot, bots, setSelectedBot } = useBots()
  const { session } = useAuth()
  const [period, setPeriod] = useState("today")
  const [tablePeriod, setTablePeriod] = useState("month")
  const [chatOpen, setChatOpen] = useState(false)
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null)

  const userId = session?.user?.id || session?.userId

  // Conversas recentes
  const { data: conversationsData, isLoading: loadingConversations } = useSWR<{
    conversations: Conversation[]
    total: number
  }>(
    selectedBot ? `/api/conversations?bot_id=${selectedBot.id}&period=${tablePeriod}` : null,
    fetcher,
    { refreshInterval: 30000 },
  )

  // Faturamento / pagamentos (stats) filtrados por periodo
  const { data: paymentsData } = useSWR<{
    stats: {
      total: number
      approved: number
      approvedUniqueUsers: number
      pending: number
      totalApproved: number
    }
  }>(
    userId ? `/api/payments/list?userId=${userId}&period=${period}&limit=1&offset=0` : null,
    fetcher,
    { refreshInterval: 30000 },
  )

  const stats = paymentsData?.stats
  const faturamento = stats?.totalApproved || 0
  const aprovados = stats?.approved || 0
  const totalPix = stats?.total || 0
  const taxaConversao = totalPix > 0 ? (aprovados / totalPix) * 100 : 0
  const ticketMedio = aprovados > 0 ? faturamento / aprovados : 0
  const totalStarts = conversationsData?.total || 0

  const conversations = conversationsData?.conversations || []

  if (!selectedBot) {
    return <NoBotSelected />
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-background">
      {/* Top Header */}
      <header className="px-8 py-5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4 bg-card px-4 py-2.5 rounded-full shadow-sm w-full max-w-[400px] border border-border">
          <Search size={18} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar"
            className="bg-transparent border-none outline-none text-sm w-full placeholder-muted-foreground text-foreground"
          />
        </div>

        <div className="flex items-center gap-4">
          <Link href="/bots">
            <button className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center text-foreground shadow-sm hover:bg-muted transition-colors">
              <Bot size={18} />
            </button>
          </Link>
          <div className="h-6 w-px bg-border mx-2" />
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shadow-sm">
                  <Bot size={20} className="text-foreground" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground leading-tight">{selectedBot.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {selectedBot.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <ChevronDown size={16} className="text-muted-foreground ml-1" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="end">
              <div className="flex flex-col gap-1">
                {bots.map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => setSelectedBot(bot)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedBot?.id === bot.id
                        ? "bg-secondary text-foreground font-medium"
                        : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${bot.status === "active" ? "bg-primary" : "bg-muted-foreground"}`} />
                    <span className="truncate">{bot.name}</span>
                    {selectedBot?.id === bot.id && <Check size={14} className="ml-auto" />}
                  </button>
                ))}
                <div className="h-px bg-border my-1" />
                <Link href="/bots" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-muted transition-colors">
                  <Plus size={14} />
                  <span>Gerenciar bots</span>
                </Link>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {/* Seletor de periodo */}
        <div className="bg-card rounded-2xl border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-muted-foreground">
            <Clock size={14} />
            Período
          </div>
          <div className="flex items-center gap-1 bg-secondary rounded-xl p-1 overflow-x-auto">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  period === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de metricas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          {/* Coluna esquerda: 2x2 de cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vendas Aprovadas */}
            <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <DollarSign size={18} className="text-primary" />
                </div>
                <span className="font-semibold text-foreground">Vendas Aprovadas</span>
              </div>
              <div className="text-3xl font-bold text-foreground">R$ {formatBRL(faturamento)}</div>
              <div className="mt-auto pt-4">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(100, taxaConversao)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {taxaConversao.toFixed(0)}% Aprov.
                </p>
              </div>
            </div>

            {/* Taxa de Conversao */}
            <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <TrendingUp size={18} className="text-primary" />
                </div>
                <span className="font-semibold text-foreground">Taxa de Conversão</span>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <Gauge value={taxaConversao} />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {aprovados} pagos de {totalPix} PIX
              </p>
            </div>

            {/* Total Starts */}
            <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Zap size={18} className="text-primary" />
                </div>
                <span className="font-semibold text-foreground">Total Starts</span>
              </div>
              <div className="text-3xl font-bold text-foreground">{totalStarts}</div>
              <p className="text-xs text-muted-foreground mt-1">leads iniciaram conversa</p>
            </div>

            {/* Ticket Medio */}
            <div className="bg-card rounded-3xl p-6 border border-border shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Receipt size={18} className="text-primary" />
                </div>
                <span className="font-semibold text-foreground">Ticket Médio</span>
              </div>
              <div className="text-3xl font-bold text-foreground">R$ {formatBRL(ticketMedio)}</div>
              <p className="text-xs text-muted-foreground mt-1">Vendas: R$ {formatBRL(faturamento)}</p>
              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="text-muted-foreground">PIX Pagos</span>
                <span className="font-bold text-foreground">{aprovados}</span>
              </div>
              <p className="text-[11px] text-muted-foreground text-right mt-1">de {totalPix} PIX gerados</p>
            </div>
          </div>

          {/* Coluna direita: grafico de desempenho */}
          <DashboardPerformanceChart userId={userId} />
        </div>

        {/* Tabela + Ranking */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4 items-stretch">
          {/* Conversas Recentes */}
          <div className="bg-card rounded-3xl p-6 shadow-sm border border-border">
            <div className="flex flex-row justify-between items-center mb-6 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center">
                  <List size={16} className="text-foreground" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">Conversas Recentes</h3>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-secondary px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">
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
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="pb-3 font-medium px-2">Usuário</th>
                    <th className="pb-3 font-medium px-2">Mensagens</th>
                    <th className="pb-3 font-medium px-2">Status</th>
                    <th className="pb-3 font-medium px-2">Tempo de Resposta</th>
                    <th className="pb-3 font-medium px-2">Resultado</th>
                    <th className="pb-3 font-medium px-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingConversations ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          Carregando conversas...
                        </div>
                      </td>
                    </tr>
                  ) : conversations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        Nenhuma conversa registrada ainda
                      </td>
                    </tr>
                  ) : (
                    conversations.map((conv) => (
                      <tr
                        key={conv.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedChatUserId(conv.telegramUserId)
                          setChatOpen(true)
                        }}
                      >
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                              <User size={16} className="text-foreground" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{conv.nome}</span>
                              <span className="text-xs text-muted-foreground">{conv.telegram}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare size={14} className="text-muted-foreground" />
                            <span className="text-sm text-foreground">{conv.mensagens}</span>
                            {conv.fluxo && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full truncate max-w-[100px]">
                                {conv.fluxo}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              conv.status === "ativo"
                                ? "bg-green-500/20 text-green-400"
                                : conv.status === "aguardando"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : conv.status === "concluido"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-muted text-muted-foreground"
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
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock size={14} />
                            {conv.tempoResposta}
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <span
                            className={`text-sm font-medium ${
                              conv.resultadoTipo === "positivo"
                                ? "text-green-400"
                                : conv.resultadoTipo === "negativo"
                                  ? "text-red-400"
                                  : "text-muted-foreground"
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
          </div>

          {/* Ranking Top 5 */}
          <DashboardRanking />
        </div>
      </div>

      {/* Chat Dialog */}
      <ChatDialog
        open={chatOpen}
        onOpenChange={setChatOpen}
        botId={selectedBot?.id}
        initialUserId={selectedChatUserId || undefined}
      />
    </div>
  )
}
