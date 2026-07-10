"use client"

import { useEffect, useMemo, useState } from "react"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { useBots } from "@/lib/bot-context"
import { getDomains, addDomain, type RedirectDomain } from "@/lib/redirect-domains"
import {
  Shuffle,
  Pencil,
  RefreshCw,
  Globe,
  Plus,
  Check,
  X,
  Loader2,
  Workflow,
  Bot as BotIcon,
  Link2,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"

type FlowLite = { id: string; name: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  userEmail?: string
  userName?: string
  origin: string
  onCreated: (siteId: string) => void
}

function randomSlug(len = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let out = ""
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export function CreateRedirectModal({
  open,
  onOpenChange,
  userId,
  userEmail,
  userName,
  origin,
  onCreated,
}: Props) {
  const { bots } = useBots()

  const [step, setStep] = useState<1 | 2>(1)

  // Dominios
  const [domains, setDomains] = useState<RedirectDomain[]>([])
  const [selectedDomain, setSelectedDomain] = useState<string>("")
  const [addingDomain, setAddingDomain] = useState(false)
  const [newDomain, setNewDomain] = useState("")

  // Config (etapa 2)
  const [slugType, setSlugType] = useState<"random" | "custom">("random")
  const [slug, setSlug] = useState(randomSlug())
  const [active, setActive] = useState(true)
  const [cloaker, setCloaker] = useState(false)
  const [cloakerV2, setCloakerV2] = useState(false)
  const [destino, setDestino] = useState<"telegram-bot" | "url">("telegram-bot")
  const [botId, setBotId] = useState<string>("")
  const [customUrl, setCustomUrl] = useState("")
  const [flows, setFlows] = useState<FlowLite[]>([])
  const [selectedFlows, setSelectedFlows] = useState<FlowLite[]>([])
  const [creating, setCreating] = useState(false)

  // Reset ao abrir
  useEffect(() => {
    if (!open) return
    setStep(1)
    setSlugType("random")
    setSlug(randomSlug())
    setActive(true)
    setCloaker(false)
    setCloakerV2(false)
    setDestino("telegram-bot")
    setBotId("")
    setCustomUrl("")
    setSelectedFlows([])
    setAddingDomain(false)
    setNewDomain("")

    if (userId) {
      const list = getDomains(userId)
      setDomains(list)
      setSelectedDomain(list[0]?.host || "")
    }
  }, [open, userId])

  // Auto seleciona primeiro bot
  useEffect(() => {
    if (bots.length > 0 && !botId) setBotId(bots[0].id)
  }, [bots, botId])

  // Buscar fluxos do usuario
  useEffect(() => {
    if (!open || !userId) return
    ;(async () => {
      const { data } = await supabase
        .from("flows")
        .select("id, name")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
      if (data) setFlows(data as FlowLite[])
    })()
  }, [open, userId])

  const availableFlows = useMemo(
    () => flows.filter((f) => !selectedFlows.some((s) => s.id === f.id)),
    [flows, selectedFlows],
  )

  const handleAddDomain = () => {
    if (!userId || !newDomain.trim()) return
    const list = addDomain(userId, newDomain)
    setDomains(list)
    const normalized = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    setSelectedDomain(normalized)
    setNewDomain("")
    setAddingDomain(false)
    toast.success("Dominio adicionado!")
  }

  const handleCreate = async () => {
    if (!userId) return
    if (slugType === "custom" && !slug.trim()) {
      toast.error("Digite uma slug personalizada")
      return
    }
    if (destino === "url" && !customUrl.trim()) {
      toast.error("Digite a URL de destino")
      return
    }

    setCreating(true)

    const finalSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
    const autoName = `Redirecionamento ${new Date().toLocaleDateString("pt-BR")}`

    // Resolve URL de destino
    const selectedBot = bots.find((b) => b.id === botId)
    let redirectUrl = ""
    if (destino === "url") {
      redirectUrl = customUrl.trim()
    } else if (selectedBot?.group_link) {
      redirectUrl = selectedBot.group_link
    }

    try {
      const res = await fetch("/api/dragon-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userEmail,
          userName,
          nome: autoName,
          slug: finalSlug,
          template: "buttons",
          presell_type: "redirect",
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Erro ao criar redirect")
        setCreating(false)
        return
      }

      const siteId = data.site.id

      // Salva a configuracao completa em page_data
      await fetch(`/api/dragon-bio/${siteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_data: {
            redirectData: {
              redirectUrl,
              delay: 2,
              message: "Redirecionando...",
              fallbackText: "Clique aqui se nao for redirecionado",
              background: { type: "color", color: "#0088cc", imageDesktop: "", imageMobile: "" },
            },
            redirectConfig: {
              domain: selectedDomain,
              slugType,
              active,
              cloaker,
              cloakerV2,
              destino,
              botId: destino === "telegram-bot" ? botId : null,
              botName: destino === "telegram-bot" ? selectedBot?.name || null : null,
              customUrl: destino === "url" ? customUrl.trim() : null,
              flows: selectedFlows,
            },
          },
        }),
      })

      toast.success("Redirect criado!")
      onOpenChange(false)
      onCreated(siteId)
    } catch (error) {
      console.error("Erro ao criar redirect:", error)
      toast.error("Erro ao criar redirect")
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Plus className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Criar Redirecionador</h2>
            <p className="text-sm text-muted-foreground">
              {step === 1 ? "Escolha o dominio do seu link" : "Configure seu link de redirecionamento"}
            </p>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-5 pt-4">
          <StepDot n={1} label="Dominio" active={step >= 1} current={step === 1} />
          <div className="h-px flex-1 bg-border" />
          <StepDot n={2} label="Configuracao" active={step >= 2} current={step === 2} />
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-5 p-5">
            {step === 1 ? (
              <div className="space-y-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dominios disponiveis
                </Label>
                <div className="flex flex-col gap-2">
                  {domains.map((d) => {
                    const isSel = selectedDomain === d.host
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDomain(d.host)}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          isSel
                            ? "border-accent bg-accent/10"
                            : "border-border bg-card hover:border-accent/40"
                        }`}
                      >
                        <Globe className={`h-4 w-4 ${isSel ? "text-accent" : "text-muted-foreground"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{d.host}</p>
                          {d.isDefault && (
                            <p className="text-[11px] text-muted-foreground">Dominio padrao</p>
                          )}
                        </div>
                        {isSel && <Check className="h-4 w-4 text-accent" />}
                      </button>
                    )
                  })}
                </div>

                {addingDomain ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="meudominio.com"
                      className="h-10"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddDomain()
                      }}
                    />
                    <Button size="icon" onClick={handleAddDomain} className="h-10 w-10 shrink-0 bg-accent text-accent-foreground hover:bg-accent/90">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setAddingDomain(false)
                        setNewDomain("")
                      }}
                      className="h-10 w-10 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setAddingDomain(true)}
                    className="w-full justify-center rounded-xl border-dashed"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar dominio proprio
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Tipo de slug */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tipo de slug
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSlugType("random")}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                        slugType === "random"
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-accent/40"
                      }`}
                    >
                      <Shuffle className="h-4 w-4" />
                      Aleatorio
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlugType("custom")}
                      className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition-colors ${
                        slugType === "custom"
                          ? "border-accent bg-accent/10 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-accent/40"
                      }`}
                    >
                      <Pencil className="h-4 w-4" />
                      Personalizado
                    </button>
                  </div>
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Slug
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      readOnly={slugType === "random"}
                      placeholder="minha-oferta"
                      className="h-10"
                    />
                    {slugType === "random" && (
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setSlug(randomSlug())}
                        className="h-10 w-10 shrink-0"
                        aria-label="Gerar nova slug"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {origin}/s/{slug || "..."}
                  </p>
                </div>

                {/* Toggles */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                  <label className="flex cursor-pointer items-center gap-2">
                    <Switch checked={active} onCheckedChange={setActive} />
                    <span className="text-sm font-medium text-foreground">Ativo</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <Switch checked={cloaker} onCheckedChange={setCloaker} />
                    <span className="text-sm font-medium text-foreground">Cloaker</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <Switch checked={cloakerV2} onCheckedChange={setCloakerV2} />
                    <span className="text-sm font-medium text-foreground">Cloaker V2</span>
                  </label>
                </div>

                {/* Dominio selecionado */}
                <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <Globe className="h-4 w-4 text-accent" />
                  <span className="flex-1 truncate text-sm font-medium text-foreground">
                    {selectedDomain}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep(1)}
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Alterar
                  </Button>
                </div>

                {/* Destino */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Destino
                  </Label>
                  <Select value={destino} onValueChange={(v) => setDestino(v as "telegram-bot" | "url")}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="telegram-bot">
                        <span className="flex items-center gap-2">
                          <BotIcon className="h-4 w-4" />
                          Telegram (Bot)
                        </span>
                      </SelectItem>
                      <SelectItem value="url">
                        <span className="flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          URL personalizada
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {destino === "telegram-bot" ? (
                    <>
                      <p className="text-xs text-muted-foreground">Redireciona para o bot do Telegram</p>
                      {bots.length === 0 ? (
                        <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">
                          Nenhum bot cadastrado. Adicione um bot para usar esse destino.
                        </p>
                      ) : (
                        <Select value={botId} onValueChange={setBotId}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Selecione o bot" />
                          </SelectTrigger>
                          <SelectContent>
                            {bots.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </>
                  ) : (
                    <Input
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://t.me/seu_bot"
                      className="h-11"
                    />
                  )}
                </div>

                {/* Fluxos */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Fluxos
                  </Label>
                  <div className="min-h-[64px] rounded-xl border border-border bg-card p-3">
                    {selectedFlows.length === 0 ? (
                      <p className="py-3 text-center text-sm text-muted-foreground">Nenhum fluxo selecionado</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedFlows.map((f) => (
                          <span
                            key={f.id}
                            className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                          >
                            <Workflow className="h-3 w-3" />
                            {f.name}
                            <button
                              type="button"
                              onClick={() => setSelectedFlows((prev) => prev.filter((x) => x.id !== f.id))}
                              aria-label={`Remover ${f.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <Select
                    value=""
                    onValueChange={(id) => {
                      const flow = flows.find((f) => f.id === id)
                      if (flow) setSelectedFlows((prev) => [...prev, flow])
                    }}
                    disabled={availableFlows.length === 0}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={availableFlows.length === 0 ? "Nenhum fluxo disponivel" : "Adicionar fluxo..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFlows.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-border p-5">
          {step === 1 ? (
            <>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedDomain}
                className="flex-1 bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
              >
                Continuar
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                Criar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StepDot({ n, label, active, current }: { n: number; label: string; active: boolean; current: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
          active ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {n}
      </div>
      <span className={`text-xs font-medium ${current ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  )
}
