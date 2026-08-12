"use client"

import { useState } from "react"
import useSWR from "swr"

import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { MessageCircle, Flag, Loader2, Send, ChevronRight, ShieldAlert } from "lucide-react"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface WhatsappContact {
  id: string
  name: string
  number: string
}

const REASONS = [
  "Uso indevido da plataforma",
  "Conteudo proibido",
  "Golpe ou fraude",
  "Comportamento abusivo",
  "Problema tecnico",
  "Outro",
]

export default function SuportePage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"whatsapp" | "report">("whatsapp")

  // WhatsApp contacts
  const { data: whatsappData, isLoading: loadingContacts } = useSWR<{ contacts: WhatsappContact[] }>(
    "/api/support/whatsapp",
    fetcher
  )
  const contacts = whatsappData?.contacts || []

  // Report form state
  const [name, setName] = useState("")
  const [anonymous, setAnonymous] = useState(false)
  const [reason, setReason] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmitReport = async () => {
    if (!reason) {
      toast({ title: "Selecione o motivo do contato", variant: "destructive" })
      return
    }
    if (message.trim().length < 5) {
      toast({ title: "Descreva o que esta acontecendo", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/support/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: anonymous ? "" : name,
          reason,
          message,
          reporterUserId: session?.userId || null,
        }),
      })

      if (!res.ok) throw new Error()

      toast({ title: "Relato enviado", description: "Nossa equipe vai analisar o quanto antes." })
      setName("")
      setAnonymous(false)
      setReason("")
      setMessage("")
    } catch {
      toast({ title: "Erro ao enviar", description: "Tente novamente em instantes.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = [
    { id: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
    { id: "report" as const, label: "Relatar", icon: Flag },
  ]

  return (
    <ScrollArea className="flex-1">
      <div className="min-h-full bg-background">
        <div className="max-w-2xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-gray-400 font-medium mb-1">
              Central de Ajuda
            </p>
            <h1 className="text-3xl font-black text-white tracking-tight">Suporte</h1>
            <p className="text-sm text-gray-500 mt-1">
              Fale com a gente pelo WhatsApp ou registre um relato sobre a plataforma.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8 p-1 bg-[#3a3a3e]/70 rounded-2xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
                  activeTab === tab.id
                    ? "bg-[#1c1c1e] text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* WhatsApp tab */}
          {activeTab === "whatsapp" && (
            <div>
              {loadingContacts ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#3a3a3e] flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Nenhum contato de suporte disponivel no momento.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {contacts.map((contact) => (
                    <a
                      key={contact.id}
                      href={`https://wa.me/${contact.number}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 p-4 bg-[#1c1c1e] rounded-2xl border border-[#2a2a2e] hover:border-[#25D366]/40 hover:shadow-md transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center shrink-0">
                        <MessageCircle className="w-6 h-6 text-[#25D366]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{contact.name}</p>
                        <p className="text-sm text-gray-500">Abrir conversa no WhatsApp</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#25D366] transition-colors" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Report tab */}
          {activeTab === "report" && (
            <div className="bg-[#1c1c1e] rounded-2xl border border-[#2a2a2e] p-6">
              <div className="flex items-start gap-3 mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/30">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 leading-relaxed">
                  Relate qualquer uso indevido da plataforma ou comportamento de outros usuarios. Seu
                  relato sera analisado pela nossa equipe.
                </p>
              </div>

              {/* Nome */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Seu nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={anonymous}
                  placeholder="Como podemos te chamar?"
                  className="w-full px-4 py-3 rounded-xl border border-[#2a2a2e] text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ccff00]/50 focus:border-[#ccff00] disabled:bg-[#2a2a2e] disabled:text-gray-400 transition-all"
                />
                <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={anonymous}
                    onChange={(e) => setAnonymous(e.target.checked)}
                    className="w-4 h-4 rounded border-[#3a3a3e] text-white focus:ring-0"
                  />
                  <span className="text-sm text-gray-400">Prefiro nao informar (enviar anonimo)</span>
                </label>
              </div>

              {/* Motivo */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Motivo do contato</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={cn(
                        "px-4 py-2.5 rounded-xl text-sm font-medium text-left transition-all border",
                        reason === r
                          ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                          : "bg-[#232325] text-gray-400 border-[#2a2a2e] hover:border-[#3a3a3e]"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Relato */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-300 mb-2">O que esta acontecendo?</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Descreva em detalhes o que voce quer relatar. Se for sobre outro usuario, informe o nome/usuario dele."
                  className="w-full px-4 py-3 rounded-xl border border-[#2a2a2e] text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#ccff00]/50 focus:border-[#ccff00] resize-none transition-all"
                />
              </div>

              <button
                onClick={handleSubmitReport}
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#ccff00] text-black font-bold text-sm rounded-full hover:bg-[#d4ff4d] transition-all shadow-lg disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar relato
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
