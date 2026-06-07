"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import {
  MessageCircle,
  Flag,
  Loader2,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  ShieldAlert,
  CheckCircle,
  Eye,
  Clock,
  X,
} from "lucide-react"

interface WhatsappContact {
  id: string
  name: string
  number: string
}

interface SupportReport {
  id: string
  name: string
  reason: string
  message: string
  reporter_user_id: string | null
  status: "pending" | "reviewed" | "resolved"
  created_at: string
}

export default function SuportePage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"contacts" | "reports">("contacts")

  // WhatsApp contacts
  const [contacts, setContacts] = useState<WhatsappContact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [savingContacts, setSavingContacts] = useState(false)

  // Reports
  const [reports, setReports] = useState<SupportReport[]>([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [selectedReport, setSelectedReport] = useState<SupportReport | null>(null)

  useEffect(() => {
    loadContacts()
    loadReports()
  }, [])

  const loadContacts = async () => {
    setLoadingContacts(true)
    try {
      const res = await fetch("/api/support/whatsapp")
      const data = await res.json()
      setContacts(data.contacts || [])
    } catch {
      toast({ title: "Erro ao carregar contatos", variant: "destructive" })
    } finally {
      setLoadingContacts(false)
    }
  }

  const loadReports = async () => {
    setLoadingReports(true)
    try {
      const res = await fetch("/api/support/reports")
      const data = await res.json()
      setReports(data.reports || [])
    } catch {
      toast({ title: "Erro ao carregar relatos", variant: "destructive" })
    } finally {
      setLoadingReports(false)
    }
  }

  const addContact = () => {
    setContacts((prev) => [...prev, { id: crypto.randomUUID(), name: "", number: "" }])
  }

  const updateContact = (id: string, field: "name" | "number", value: string) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)))
  }

  const removeContact = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  const saveContacts = async () => {
    setSavingContacts(true)
    try {
      const res = await fetch("/api/support/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setContacts(data.contacts || [])
      toast({ title: "Contatos salvos" })
    } catch {
      toast({ title: "Erro ao salvar contatos", variant: "destructive" })
    } finally {
      setSavingContacts(false)
    }
  }

  const updateReportStatus = async (id: string, status: SupportReport["status"]) => {
    try {
      const res = await fetch("/api/support/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error()
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)))
      setSelectedReport((prev) => (prev && prev.id === id ? { ...prev, status } : prev))
      toast({ title: "Status atualizado" })
    } catch {
      toast({ title: "Erro ao atualizar", variant: "destructive" })
    }
  }

  const deleteReport = async (id: string) => {
    try {
      const res = await fetch(`/api/support/reports?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setReports((prev) => prev.filter((r) => r.id !== id))
      setSelectedReport(null)
      toast({ title: "Relato removido" })
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" })
    }
  }

  const statusMeta: Record<SupportReport["status"], { label: string; color: string; bg: string }> = {
    pending: { label: "Pendente", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
    reviewed: { label: "Em analise", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
    resolved: { label: "Resolvido", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="p-6 lg:p-8 space-y-8">
          {/* Header */}
          <div
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-6"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(149, 228, 104, 0.2), rgba(59, 130, 246, 0.1))",
                    border: "1px solid rgba(149, 228, 104, 0.2)",
                  }}
                >
                  <MessageCircle className="w-5 h-5 text-[#95e468]" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Suporte</h1>
              </div>
              <p className="text-[#666666] text-sm">
                Configure os contatos de WhatsApp e acompanhe os relatos dos usuarios
              </p>
            </div>
            <button
              onClick={() => {
                loadContacts()
                loadReports()
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-[#a1a1a1] hover:text-white"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <RefreshCw className={cn("h-4 w-4", (loadingContacts || loadingReports) && "animate-spin")} />
              Atualizar
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { id: "contacts" as const, label: "Contatos WhatsApp", icon: MessageCircle, count: contacts.length },
              { id: "reports" as const, label: "Relatos", icon: Flag, count: pendingCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  activeTab === tab.id ? "text-[#050505]" : "text-[#a1a1a1] hover:text-white"
                )}
                style={
                  activeTab === tab.id
                    ? {
                        background: "linear-gradient(135deg, #95e468, #7bc752)",
                        boxShadow: "0 0 15px rgba(149, 228, 104, 0.3)",
                      }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
                }
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={
                      activeTab === tab.id
                        ? { background: "rgba(0,0,0,0.15)" }
                        : { background: "rgba(255,255,255,0.06)" }
                    }
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Contacts tab */}
          {activeTab === "contacts" && (
            <div
              className="rounded-2xl p-6"
              style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">Numeros de WhatsApp</h2>
                  <p className="text-sm text-[#666666]">Esses contatos aparecem na aba de suporte dos usuarios</p>
                </div>
                <button
                  onClick={addContact}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[#95e468] transition-colors hover:bg-[#95e468]/10"
                  style={{ border: "1px solid rgba(149, 228, 104, 0.2)" }}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar
                </button>
              </div>

              {loadingContacts ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-[#95e468]" />
                </div>
              ) : (
                <div className="space-y-3">
                  {contacts.length === 0 && (
                    <p className="text-sm text-[#666666] py-8 text-center">
                      Nenhum contato. Clique em &quot;Adicionar&quot; para criar o primeiro.
                    </p>
                  )}
                  {contacts.map((contact) => (
                    <div key={contact.id} className="flex flex-col sm:flex-row gap-3">
                      <input
                        value={contact.name}
                        onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                        placeholder="Nome (ex: Suporte 1)"
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-[#666666] focus:outline-none focus:ring-2 focus:ring-[#95e468]/30"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      />
                      <input
                        value={contact.number}
                        onChange={(e) => updateContact(contact.id, "number", e.target.value)}
                        placeholder="Numero com DDI (ex: 5511999999999)"
                        className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-[#666666] focus:outline-none focus:ring-2 focus:ring-[#95e468]/30"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                      />
                      <button
                        onClick={() => removeContact(contact.id)}
                        className="flex items-center justify-center w-10 h-10 rounded-xl text-[#ef4444] transition-colors hover:bg-[#ef4444]/10 shrink-0"
                        style={{ border: "1px solid rgba(239, 68, 68, 0.2)" }}
                        aria-label="Remover contato"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={saveContacts}
                  disabled={savingContacts}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#050505] transition-all disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #95e468, #7bc752)",
                    boxShadow: "0 0 15px rgba(149, 228, 104, 0.3)",
                  }}
                >
                  {savingContacts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar contatos
                </button>
              </div>
            </div>
          )}

          {/* Reports tab */}
          {activeTab === "reports" && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="px-6 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <h2 className="text-lg font-semibold text-white">Relatos recebidos</h2>
              </div>

              {loadingReports ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-[#95e468]" />
                </div>
              ) : reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Flag className="h-10 w-10 text-[#444444]" />
                  </div>
                  <p className="text-sm text-[#666666]">Nenhum relato recebido</p>
                </div>
              ) : (
                <div>
                  {reports.map((report, i) => (
                    <div
                      key={report.id}
                      className="p-5 flex items-center gap-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom: i < reports.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                      }}
                      onClick={() => setSelectedReport(report)}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.15)" }}
                      >
                        <ShieldAlert className="w-5 h-5 text-[#ef4444]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-white">{report.reason}</p>
                        <p className="text-sm text-[#666666] truncate">
                          {report.name} - {report.message}
                        </p>
                      </div>
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-[#666666]">
                          {new Date(report.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span
                        className="px-3 py-1.5 rounded-full text-xs font-medium shrink-0"
                        style={{
                          background: statusMeta[report.status].bg,
                          color: statusMeta[report.status].color,
                          border: `1px solid ${statusMeta[report.status].color}30`,
                        }}
                      >
                        {statusMeta[report.status].label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Report detail modal */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent
          className="sm:max-w-lg p-0 gap-0 overflow-hidden rounded-2xl"
          style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {selectedReport && (
            <>
              <div className="p-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(239, 68, 68, 0.1)" }}
                    >
                      <ShieldAlert className="h-5 w-5 text-[#ef4444]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{selectedReport.reason}</h3>
                      <p className="text-sm text-[#666666]">
                        {new Date(selectedReport.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <span
                    className="px-3 py-1.5 rounded-full text-xs font-medium shrink-0"
                    style={{
                      background: statusMeta[selectedReport.status].bg,
                      color: statusMeta[selectedReport.status].color,
                    }}
                  >
                    {statusMeta[selectedReport.status].label}
                  </span>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-[#666666] mb-1">Relatado por</p>
                  <p className="text-sm text-white">
                    {selectedReport.name}
                    {selectedReport.reporter_user_id && (
                      <span className="text-[#444444]"> (ID: {selectedReport.reporter_user_id})</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#666666] mb-1">Descricao</p>
                  <div
                    className="p-4 rounded-xl text-sm text-white whitespace-pre-wrap"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {selectedReport.message}
                  </div>
                </div>
              </div>

              <div
                className="p-5 flex flex-wrap items-center gap-2"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <button
                  onClick={() => updateReportStatus(selectedReport.id, "reviewed")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Marcar em analise
                </button>
                <button
                  onClick={() => updateReportStatus(selectedReport.id, "resolved")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Resolver
                </button>
                <button
                  onClick={() => updateReportStatus(selectedReport.id, "pending")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#f59e0b] hover:bg-[#f59e0b]/10 transition-colors"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Pendente
                </button>
                <button
                  onClick={() => deleteReport(selectedReport.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors ml-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
