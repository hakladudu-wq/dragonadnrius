"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ChevronLeft, 
  Palette,
  Save,
  Check,
  Loader2,
  Eye,
  ExternalLink,
  Settings,
  Link2,
  Type,
  Image as ImageIcon,
  Upload,
  Activity,
  Shuffle,
  Pencil,
  RefreshCw,
  Globe,
  Plus,
  X,
  Workflow,
  Bot as BotIcon,
  Shield,
} from "lucide-react"
import { PixelConfigPanel, PixelConfig } from "@/components/dragon-sites/pixel-config"
import { useBots } from "@/lib/bot-context"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabase"
import { getDomains, addDomain, type RedirectDomain } from "@/lib/redirect-domains"
import { toast } from "sonner"

type FlowLite = { id: string; name: string }

type RedirectConfig = {
  domain: string
  slugType: "random" | "custom"
  active: boolean
  cloaker: boolean
  cloakerV2: boolean
  destino: "telegram-bot" | "url"
  botId: string | null
  botName: string | null
  customUrl: string | null
  flows: FlowLite[]
}

const defaultRedirectConfig: RedirectConfig = {
  domain: "",
  slugType: "custom",
  active: true,
  cloaker: false,
  cloakerV2: false,
  destino: "telegram-bot",
  botId: null,
  botName: null,
  customUrl: null,
  flows: [],
}

function randomSlug(len = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let out = ""
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

// Types para cada tipo de presell
type AgeVerificationData = {
  headline: string
  yesButtonText: string
  noButtonText: string
  yesButtonUrl: string
  noButtonUrl: string
  background: {
    type: "color" | "image"
    color: string
    imageDesktop: string
    imageMobile: string
  }
}

type ThankYouData = {
  headline: string
  description: string
  buttonText: string
  buttonUrl: string
  showFooter: boolean
  footerText: string
  footerLinkText: string
  footerLinkUrl: string
  background: {
    type: "color" | "image"
    color: string
    gradientFrom: string
    gradientTo: string
  }
  buttonColor: string
}

type RedirectData = {
  redirectUrl: string
  instantRedirect: boolean
  delay: number
  message: string
  fallbackText: string
  background: {
    type: "color" | "image"
    color: string
    imageDesktop: string
    imageMobile: string
  }
}

type PresellType = "age-verification" | "thank-you" | "redirect"

interface PageProps {
  params: Promise<{ id: string }>
}

const defaultAgeVerification: AgeVerificationData = {
  headline: "Voce tem 18 anos ou mais?",
  yesButtonText: "TENHO 18",
  noButtonText: "NAO TENHO 18",
  yesButtonUrl: "",
  noButtonUrl: "",
  background: {
    type: "color",
    color: "#ffffff",
    imageDesktop: "",
    imageMobile: "",
  }
}

const defaultThankYou: ThankYouData = {
  headline: "Muito Obrigado!",
  description: "Sua acao foi concluida com sucesso. Agradecemos pela confianca e por fazer parte da nossa jornada. Estamos muito felizes em ter voce conosco!",
  buttonText: "Voltar para o Inicio",
  buttonUrl: "",
  showFooter: true,
  footerText: "Precisa de ajuda?",
  footerLinkText: "Entre em contato",
  footerLinkUrl: "",
  background: {
    type: "color",
    color: "#f8fafc",
    gradientFrom: "#f8fafc",
    gradientTo: "#e2e8f0",
  },
  buttonColor: "#2563eb",
}

const defaultRedirect: RedirectData = {
  redirectUrl: "",
  instantRedirect: false,
  delay: 2,
  message: "Redirecionando...",
  fallbackText: "Clique aqui se nao for redirecionado",
  background: {
    type: "color",
    color: "#0088cc",
    imageDesktop: "",
    imageMobile: "",
  }
}

export default function PresellEditorPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { bots } = useBots()
  const { session } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [site, setSite] = useState<any>(null)
  const [presellType, setPresellType] = useState<PresellType>("age-verification")
  const [ageData, setAgeData] = useState<AgeVerificationData>(defaultAgeVerification)
  const [thankYouData, setThankYouData] = useState<ThankYouData>(defaultThankYou)
  const [redirectData, setRedirectData] = useState<RedirectData>(defaultRedirect)
  const [redirectConfig, setRedirectConfig] = useState<RedirectConfig>(defaultRedirectConfig)
  const [flows, setFlows] = useState<FlowLite[]>([])
  const [domains, setDomains] = useState<RedirectDomain[]>([])
  const [addingDomain, setAddingDomain] = useState(false)
  const [newDomain, setNewDomain] = useState("")
  const [activeTab, setActiveTab] = useState("content")
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [siteName, setSiteName] = useState("")
const [siteSlug, setSiteSlug] = useState("")
  const [pixelConfig, setPixelConfig] = useState<PixelConfig>({ provider: null })

  // Carrega dominios (localStorage) e fluxos do usuario para o painel de redirect
  useEffect(() => {
    if (!session?.userId) return
    setDomains(getDomains(session.userId))
    ;(async () => {
      const { data } = await supabase
        .from("flows")
        .select("id, name")
        .eq("user_id", session.userId)
        .order("created_at", { ascending: false })
      if (data) setFlows(data as FlowLite[])
    })()
  }, [session?.userId])

  // Resolve a URL de destino a partir da configuracao (bot ou URL personalizada)
  const resolveRedirectUrl = (cfg: RedirectConfig): string => {
    if (cfg.destino === "url") return (cfg.customUrl || "").trim()
    const bot = bots.find((b) => b.id === cfg.botId)
    return bot?.group_link || ""
  }

  // Atualiza a config e sincroniza a URL de redirecionamento efetiva
  const updateRedirectConfig = (patch: Partial<RedirectConfig>) => {
    setRedirectConfig((prev) => {
      const next = { ...prev, ...patch }
      const resolved = resolveRedirectUrl(next)
      if (resolved) setRedirectData((rd) => ({ ...rd, redirectUrl: resolved }))
      return next
    })
    setSaved(false)
  }

  const availableFlows = flows.filter((f) => !redirectConfig.flows.some((s) => s.id === f.id))

  const handleAddDomain = () => {
    if (!session?.userId || !newDomain.trim()) return
    const list = addDomain(session.userId, newDomain)
    setDomains(list)
    const normalized = newDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")
    updateRedirectConfig({ domain: normalized })
    setNewDomain("")
    setAddingDomain(false)
    toast.success("Dominio adicionado!")
  }
  
  useEffect(() => {
  const typeParam = searchParams.get("type") as PresellType | null
    if (typeParam && ["age-verification", "thank-you", "redirect"].includes(typeParam)) {
      setPresellType(typeParam)
    }
    fetchSite()
  }, [id, searchParams])

  const fetchSite = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/dragon-bio/${id}`)
      const data = await res.json()

      if (data.site) {
        setSite(data.site)
        setSiteName(data.site.nome || "")
        setSiteSlug(data.site.slug || "")
        
        // Carregar dados salvos
        if (data.site.page_data) {
          if (data.site.presell_type) {
            setPresellType(data.site.presell_type)
          }
          if (data.site.page_data.ageData) {
            setAgeData({ ...defaultAgeVerification, ...data.site.page_data.ageData })
          }
          if (data.site.page_data.thankYouData) {
            setThankYouData({ ...defaultThankYou, ...data.site.page_data.thankYouData })
          }
if (data.site.page_data.redirectData) {
  setRedirectData({ ...defaultRedirect, ...data.site.page_data.redirectData })
  }
  if (data.site.page_data.redirectConfig) {
  setRedirectConfig({ ...defaultRedirectConfig, ...data.site.page_data.redirectConfig })
  }
  }
  // Carregar configuracao do pixel
  if (data.site.pixel_config) {
  setPixelConfig(data.site.pixel_config)
  }
  }
  } catch (error) {
      console.error("Erro ao carregar site:", error)
      toast.error("Erro ao carregar site")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Para redirect, resolve a URL efetiva do destino (bot ou URL) antes de salvar
      let finalRedirectData = redirectData
      if (presellType === "redirect") {
        const resolved = resolveRedirectUrl(redirectConfig)
        if (resolved) {
          finalRedirectData = { ...redirectData, redirectUrl: resolved }
          setRedirectData(finalRedirectData)
        }
      }

      const pageData = {
        ageData,
        thankYouData,
        redirectData: finalRedirectData,
        redirectConfig,
      }
      
      const res = await fetch(`/api/dragon-bio/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
body: JSON.stringify({
  nome: siteName,
  slug: siteSlug,
  page_data: pageData,
  presell_type: presellType,
  pixel_config: pixelConfig,
  }),
      })

      if (!res.ok) {
        throw new Error("Erro ao salvar")
      }

      setSite((prev: any) => prev ? { ...prev, nome: siteName, slug: siteSlug } : prev)
      setSaved(true)
      toast.success("Alteracoes salvas!")
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error("Erro ao salvar:", error)
      toast.error("Erro ao salvar alteracoes")
    } finally {
      setIsSaving(false)
    }
  }

  const getTypeLabel = () => {
    switch (presellType) {
      case "age-verification": return "Verificacao de Idade"
      case "thank-you": return "Pagina de Obrigado"
      case "redirect": return "Redirecionamento"
      default: return "Presell"
    }
  }

  const getTypeGradient = () => {
    switch (presellType) {
      case "age-verification": return "from-red-500 to-orange-500"
      case "thank-you": return "from-green-500 to-emerald-500"
      case "redirect": return "from-blue-500 to-cyan-500"
      default: return "from-orange-500 to-amber-400"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="editor-dark flex flex-col h-screen overflow-hidden bg-white text-foreground">
      {/* Top Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/biolink")}
            className="h-8 w-8 rounded-lg text-gray-500 hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getTypeGradient()} flex items-center justify-center`}>
              {presellType === "age-verification" && (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              )}
              {presellType === "thank-you" && (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              )}
              {presellType === "redirect" && (
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              )}
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 text-sm">{siteName || getTypeLabel()}</h1>
              <p className="text-[11px] text-gray-500">/s/{siteSlug}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/s/${siteSlug}`, '_blank')}
            className="h-9 px-3 rounded-lg text-sm"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" />
            Preview
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className={`h-9 px-4 rounded-lg text-white text-sm bg-gradient-to-r ${getTypeGradient()} hover:opacity-90`}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Salvando
              </span>
            ) : saved ? (
              <span className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5" />
                Salvo
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-3.5 h-3.5" />
                Salvar
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content - Editor + Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Panel */}
        <div className="w-[380px] border-r border-gray-200 flex flex-col bg-white flex-shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-4 pt-4">
              <TabsList className="w-full bg-gray-100 rounded-lg h-10 p-1">
                <TabsTrigger value="content" className="flex-1 rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Type className="w-3.5 h-3.5 mr-1.5" />
                  Conteudo
                </TabsTrigger>
                <TabsTrigger value="visual" className="flex-1 rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <Palette className="w-3.5 h-3.5 mr-1.5" />
                  Visual
                </TabsTrigger>
<TabsTrigger value="details" className="flex-1 rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
  <Settings className="w-3.5 h-3.5 mr-1.5" />
  Detalhes
  </TabsTrigger>
  <TabsTrigger value="pixel" className="flex-1 rounded-md text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
  <Activity className="w-3.5 h-3.5 mr-1.5" />
  Pixel
  </TabsTrigger>
  </TabsList>
            </div>

            <div className="flex-1 min-h-0 relative">
              {/* Content Tab */}
              <TabsContent value="content" className="absolute inset-0 p-4 m-0 overflow-y-auto data-[state=inactive]:hidden">
                {presellType === "age-verification" && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                        Headline (Pergunta)
                      </Label>
                      <Input
                        value={ageData.headline}
                        onChange={(e) => { setAgeData({ ...ageData, headline: e.target.value }); setSaved(false) }}
                        className="h-10 text-sm"
                        placeholder="Voce tem 18 anos ou mais?"
                      />
                    </div>

                    <div className="border-t border-gray-100 pt-5">
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3 block">
                        Botao SIM (+18)
                      </Label>
                      <div className="flex flex-col gap-3">
                        <Input
                          value={ageData.yesButtonText}
                          onChange={(e) => { setAgeData({ ...ageData, yesButtonText: e.target.value }); setSaved(false) }}
                          className="h-10 text-sm"
                          placeholder="Texto do botao"
                        />
                        <Input
                          value={ageData.yesButtonUrl}
                          onChange={(e) => { setAgeData({ ...ageData, yesButtonUrl: e.target.value }); setSaved(false) }}
                          className="h-10 text-sm font-mono"
                          placeholder="https://link-de-destino.com"
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-5">
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3 block">
                        Botao NAO (-18)
                      </Label>
                      <div className="flex flex-col gap-3">
                        <Input
                          value={ageData.noButtonText}
                          onChange={(e) => { setAgeData({ ...ageData, noButtonText: e.target.value }); setSaved(false) }}
                          className="h-10 text-sm"
                          placeholder="Texto do botao"
                        />
                        <Input
                          value={ageData.noButtonUrl}
                          onChange={(e) => { setAgeData({ ...ageData, noButtonUrl: e.target.value }); setSaved(false) }}
                          className="h-10 text-sm font-mono"
                          placeholder="https://link-alternativo.com"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {presellType === "thank-you" && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                        Headline
                      </Label>
                      <Input
                        value={thankYouData.headline}
                        onChange={(e) => { setThankYouData({ ...thankYouData, headline: e.target.value }); setSaved(false) }}
                        className="h-10 text-sm"
                        placeholder="Muito Obrigado!"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                        Descricao
                      </Label>
                      <Textarea
                        value={thankYouData.description}
                        onChange={(e) => { setThankYouData({ ...thankYouData, description: e.target.value }); setSaved(false) }}
                        className="text-sm resize-none"
                        rows={4}
                        placeholder="Sua mensagem de agradecimento..."
                      />
                    </div>

                    <div className="border-t border-gray-100 pt-5">
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3 block">
                        Botao Principal
                      </Label>
                      <div className="flex flex-col gap-3">
                        <Input
                          value={thankYouData.buttonText}
                          onChange={(e) => { setThankYouData({ ...thankYouData, buttonText: e.target.value }); setSaved(false) }}
                          className="h-10 text-sm"
                          placeholder="Texto do botao"
                        />
                        <Input
                          value={thankYouData.buttonUrl}
                          onChange={(e) => { setThankYouData({ ...thankYouData, buttonUrl: e.target.value }); setSaved(false) }}
                          className="h-10 text-sm font-mono"
                          placeholder="https://..."
                        />
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-5">
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3 block">
                        Rodape (Opcional)
                      </Label>
                      <div className="flex flex-col gap-3">
                        <Input
                          value={thankYouData.footerText}
                          onChange={(e) => { setThankYouData({ ...thankYouData, footerText: e.target.value }); setSaved(false) }}
                          className="h-10 text-sm"
                          placeholder="Precisa de ajuda?"
                        />
                        <div className="flex gap-2">
                          <Input
                            value={thankYouData.footerLinkText}
                            onChange={(e) => { setThankYouData({ ...thankYouData, footerLinkText: e.target.value }); setSaved(false) }}
                            className="h-10 text-sm flex-1"
                            placeholder="Texto do link"
                          />
                          <Input
                            value={thankYouData.footerLinkUrl}
                            onChange={(e) => { setThankYouData({ ...thankYouData, footerLinkUrl: e.target.value }); setSaved(false) }}
                            className="h-10 text-sm font-mono flex-1"
                            placeholder="https://..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {presellType === "redirect" && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                        URL de Redirecionamento
                      </Label>
                      <Input
                        value={redirectData.redirectUrl}
                        onChange={(e) => { setRedirectData({ ...redirectData, redirectUrl: e.target.value }); setSaved(false) }}
                        className="h-10 text-sm font-mono"
                        placeholder="https://destino.com"
                      />
                    </div>

                    <div>
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                        Modo de Redirecionamento
                      </Label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setRedirectData({ ...redirectData, instantRedirect: false }); setSaved(false) }}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${!redirectData.instantRedirect ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          Com tela
                        </button>
                        <button
                          onClick={() => { setRedirectData({ ...redirectData, instantRedirect: true }); setSaved(false) }}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${redirectData.instantRedirect ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          Automatico
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                        {redirectData.instantRedirect
                          ? "Redireciona na hora, sem exibir a tela de carregamento."
                          : "Exibe a tela de carregamento antes de redirecionar."}
                      </p>
                    </div>

                    {!redirectData.instantRedirect && (
                      <div>
                        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                          Delay (segundos)
                        </Label>
                        <Input
                          type="number"
                          value={redirectData.delay}
                          onChange={(e) => { setRedirectData({ ...redirectData, delay: parseInt(e.target.value) || 0 }); setSaved(false) }}
                          className="h-10 text-sm"
                          min={0}
                          max={30}
                        />
                      </div>
                    )}

                    {!redirectData.instantRedirect && (
                      <div>
                        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                          Mensagem
                        </Label>
                        <Input
                          value={redirectData.message}
                          onChange={(e) => { setRedirectData({ ...redirectData, message: e.target.value }); setSaved(false) }}
                          className="h-10 text-sm"
                          placeholder="Redirecionando..."
                        />
                      </div>
                    )}

                    {!redirectData.instantRedirect && (
                      <div>
                        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                          Texto do Link Fallback
                        </Label>
                        <Input
                          value={redirectData.fallbackText}
                          onChange={(e) => { setRedirectData({ ...redirectData, fallbackText: e.target.value }); setSaved(false) }}
                          className="h-10 text-sm"
                          placeholder="Clique aqui se nao for redirecionado"
                        />
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Visual Tab */}
              <TabsContent value="visual" className="absolute inset-0 p-4 m-0 overflow-y-auto data-[state=inactive]:hidden">
                {presellType === "age-verification" && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                        Tipo de Fundo
                      </Label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setAgeData({ ...ageData, background: { ...ageData.background, type: "color" } }); setSaved(false) }}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${ageData.background.type === "color" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          Cor
                        </button>
                        <button
                          onClick={() => { setAgeData({ ...ageData, background: { ...ageData.background, type: "image" } }); setSaved(false) }}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${ageData.background.type === "image" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          Imagem
                        </button>
                      </div>
                    </div>

                    {ageData.background.type === "color" && (
                      <div>
                        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                          Cor de Fundo
                        </Label>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                          <input
                            type="color"
                            value={ageData.background.color}
                            onChange={(e) => { setAgeData({ ...ageData, background: { ...ageData.background, color: e.target.value } }); setSaved(false) }}
                            className="w-10 h-10 rounded cursor-pointer border-0"
                          />
                          <Input
                            value={ageData.background.color}
                            onChange={(e) => { setAgeData({ ...ageData, background: { ...ageData.background, color: e.target.value } }); setSaved(false) }}
                            className="flex-1 h-10 bg-transparent border-0 font-mono text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {ageData.background.type === "image" && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                            Imagem Desktop
                          </Label>
                          <Input
                            value={ageData.background.imageDesktop}
                            onChange={(e) => { setAgeData({ ...ageData, background: { ...ageData.background, imageDesktop: e.target.value } }); setSaved(false) }}
                            className="h-10 text-sm font-mono"
                            placeholder="https://imagem-desktop.com/bg.jpg"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                            Imagem Mobile
                          </Label>
                          <Input
                            value={ageData.background.imageMobile}
                            onChange={(e) => { setAgeData({ ...ageData, background: { ...ageData.background, imageMobile: e.target.value } }); setSaved(false) }}
                            className="h-10 text-sm font-mono"
                            placeholder="https://imagem-mobile.com/bg.jpg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {presellType === "thank-you" && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                        Cor do Fundo (Gradiente)
                      </Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block">De</label>
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                            <input
                              type="color"
                              value={thankYouData.background.gradientFrom}
                              onChange={(e) => { setThankYouData({ ...thankYouData, background: { ...thankYouData.background, gradientFrom: e.target.value } }); setSaved(false) }}
                              className="w-8 h-8 rounded cursor-pointer border-0"
                            />
                            <Input
                              value={thankYouData.background.gradientFrom}
                              onChange={(e) => { setThankYouData({ ...thankYouData, background: { ...thankYouData.background, gradientFrom: e.target.value } }); setSaved(false) }}
                              className="flex-1 h-8 bg-transparent border-0 font-mono text-[10px]"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 mb-1 block">Para</label>
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                            <input
                              type="color"
                              value={thankYouData.background.gradientTo}
                              onChange={(e) => { setThankYouData({ ...thankYouData, background: { ...thankYouData.background, gradientTo: e.target.value } }); setSaved(false) }}
                              className="w-8 h-8 rounded cursor-pointer border-0"
                            />
                            <Input
                              value={thankYouData.background.gradientTo}
                              onChange={(e) => { setThankYouData({ ...thankYouData, background: { ...thankYouData.background, gradientTo: e.target.value } }); setSaved(false) }}
                              className="flex-1 h-8 bg-transparent border-0 font-mono text-[10px]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                        Cor do Botao
                      </Label>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                        <input
                          type="color"
                          value={thankYouData.buttonColor}
                          onChange={(e) => { setThankYouData({ ...thankYouData, buttonColor: e.target.value }); setSaved(false) }}
                          className="w-10 h-10 rounded cursor-pointer border-0"
                        />
                        <Input
                          value={thankYouData.buttonColor}
                          onChange={(e) => { setThankYouData({ ...thankYouData, buttonColor: e.target.value }); setSaved(false) }}
                          className="flex-1 h-10 bg-transparent border-0 font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

  {presellType === "redirect" && (() => {
                    const bg = redirectData.background || { type: "color", color: "#0088cc", imageDesktop: "", imageMobile: "" }
                    return (
                  <div className="flex flex-col gap-5">
                    <div>
                      <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                        Tipo de Fundo
                      </Label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setRedirectData({ ...redirectData, background: { ...bg, type: "color" } }); setSaved(false) }}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${bg.type === "color" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          Cor
                        </button>
                        <button
                          onClick={() => { setRedirectData({ ...redirectData, background: { ...bg, type: "image" } }); setSaved(false) }}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${bg.type === "image" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                        >
                          Imagem
                        </button>
                      </div>
                    </div>

                    {bg.type === "color" && (
                      <div>
                        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                          Cor de Fundo
                        </Label>
                        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                          <input
                            type="color"
                            value={bg.color}
                            onChange={(e) => { setRedirectData({ ...redirectData, background: { ...bg, color: e.target.value } }); setSaved(false) }}
                            className="w-10 h-10 rounded cursor-pointer border-0"
                          />
                          <Input
                            value={bg.color}
                            onChange={(e) => { setRedirectData({ ...redirectData, background: { ...bg, color: e.target.value } }); setSaved(false) }}
                            className="flex-1 h-10 bg-transparent border-0 font-mono text-sm"
                          />
                        </div>
                      </div>
                    )}

                    {bg.type === "image" && (
                      <div className="flex flex-col gap-4">
                        <div>
                          <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                            Imagem Desktop
                          </Label>
                          <Input
                            value={bg.imageDesktop}
                            onChange={(e) => { setRedirectData({ ...redirectData, background: { ...bg, imageDesktop: e.target.value } }); setSaved(false) }}
                            className="h-10 text-sm font-mono"
                            placeholder="https://imagem-desktop.com/bg.jpg"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                            Imagem Mobile
                          </Label>
                          <Input
                            value={bg.imageMobile}
                            onChange={(e) => { setRedirectData({ ...redirectData, background: { ...bg, imageMobile: e.target.value } }); setSaved(false) }}
                            className="h-10 text-sm font-mono"
                            placeholder="https://imagem-mobile.com/bg.jpg"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                    )
  })()}
              </TabsContent>

              {/* Details Tab */}
              <TabsContent value="details" className="absolute inset-0 p-4 m-0 overflow-y-auto data-[state=inactive]:hidden">
                <div className="flex flex-col gap-5">
                  <div>
                    <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                      Nome da Pagina
                    </Label>
                    <Input
                      value={siteName}
                      onChange={(e) => { setSiteName(e.target.value); setSaved(false) }}
                      placeholder="Ex: Verificacao Produto X"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                      URL da Pagina (Slug)
                    </Label>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3">
                      <span className="text-sm text-gray-400 whitespace-nowrap">/s/</span>
                      <Input
                        value={siteSlug}
                        onChange={(e) => { setSiteSlug(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')); setSaved(false) }}
                        placeholder="minha-pagina"
                        className="flex-1 h-10 bg-transparent border-0 px-0 focus-visible:ring-0 text-sm"
                      />
                    </div>
                  </div>

                  {presellType === "redirect" && (
                    <div className="flex flex-col gap-5 border-t border-gray-100 pt-5 mt-2">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide block">
                          Configuracoes do Redirect
                        </Label>
                      </div>

                      {/* Toggles: Ativo / Cloaker / Cloaker V2 */}
                      <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <label className="flex items-center justify-between cursor-pointer">
                          <span className="text-sm font-medium text-gray-700">Ativo</span>
                          <Switch
                            checked={redirectConfig.active}
                            onCheckedChange={(v) => updateRedirectConfig({ active: v })}
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">Cloaker</span>
                            <span className="text-[11px] text-gray-400">Protege sua pagina de robos e revisores.</span>
                          </div>
                          <Switch
                            checked={redirectConfig.cloaker}
                            onCheckedChange={(v) => updateRedirectConfig({ cloaker: v })}
                          />
                        </label>
                        <label className="flex items-center justify-between cursor-pointer">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-gray-700">Cloaker V2</span>
                            <span className="text-[11px] text-gray-400">Camada extra de protecao avancada.</span>
                          </div>
                          <Switch
                            checked={redirectConfig.cloakerV2}
                            onCheckedChange={(v) => updateRedirectConfig({ cloakerV2: v })}
                          />
                        </label>
                      </div>

                      {/* Tipo de slug */}
                      <div>
                        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                          Tipo de slug
                        </Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              updateRedirectConfig({ slugType: "random" })
                              setSiteSlug(randomSlug())
                            }}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-medium transition-all ${
                              redirectConfig.slugType === "random"
                                ? "bg-gray-900 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            <Shuffle className="h-3.5 w-3.5" />
                            Aleatorio
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRedirectConfig({ slugType: "custom" })}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-medium transition-all ${
                              redirectConfig.slugType === "custom"
                                ? "bg-gray-900 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Personalizado
                          </button>
                        </div>
                      </div>

                      {/* Dominio */}
                      <div>
                        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                          Dominio
                        </Label>
                        <Select
                          value={redirectConfig.domain || (domains[0]?.host ?? "")}
                          onValueChange={(v) => updateRedirectConfig({ domain: v })}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <span className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-gray-400" />
                              <SelectValue placeholder="Selecione o dominio" />
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {domains.map((d) => (
                              <SelectItem key={d.id} value={d.host}>
                                {d.host}
                                {d.isDefault ? " (padrao)" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {addingDomain ? (
                          <div className="mt-2 flex items-center gap-2">
                            <Input
                              value={newDomain}
                              onChange={(e) => setNewDomain(e.target.value)}
                              placeholder="meudominio.com"
                              className="h-9 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.nativeEvent.isComposing) handleAddDomain()
                              }}
                            />
                            <Button size="icon" onClick={handleAddDomain} className="h-9 w-9 shrink-0">
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setAddingDomain(false)
                                setNewDomain("")
                              }}
                              className="h-9 w-9 shrink-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddingDomain(true)}
                            className="mt-2 w-full justify-center border-dashed text-xs"
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Adicionar dominio proprio
                          </Button>
                        )}
                      </div>

                      {/* Destino */}
                      <div>
                        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                          Destino
                        </Label>
                        <Select
                          value={redirectConfig.destino}
                          onValueChange={(v) => {
                            const destino = v as "telegram-bot" | "url"
                            const bot = bots.find((b) => b.id === redirectConfig.botId) || bots[0]
                            updateRedirectConfig({
                              destino,
                              botId: destino === "telegram-bot" ? bot?.id ?? null : redirectConfig.botId,
                              botName: destino === "telegram-bot" ? bot?.name ?? null : redirectConfig.botName,
                            })
                          }}
                        >
                          <SelectTrigger className="h-10 text-sm">
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

                        {redirectConfig.destino === "telegram-bot" ? (
                          bots.length === 0 ? (
                            <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-500">
                              Nenhum bot cadastrado. Adicione um bot para usar esse destino.
                            </p>
                          ) : (
                            <Select
                              value={redirectConfig.botId ?? ""}
                              onValueChange={(botId) => {
                                const bot = bots.find((b) => b.id === botId)
                                updateRedirectConfig({ botId, botName: bot?.name ?? null })
                              }}
                            >
                              <SelectTrigger className="mt-2 h-10 text-sm">
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
                          )
                        ) : (
                          <Input
                            value={redirectConfig.customUrl ?? ""}
                            onChange={(e) => updateRedirectConfig({ customUrl: e.target.value })}
                            placeholder="https://t.me/seu_bot"
                            className="mt-2 h-10 text-sm font-mono"
                          />
                        )}
                      </div>

                      {/* Fluxos */}
                      <div>
                        <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-2.5 block">
                          Fluxos
                        </Label>
                        <div className="min-h-[56px] rounded-lg border border-gray-100 bg-gray-50 p-3">
                          {redirectConfig.flows.length === 0 ? (
                            <p className="py-2 text-center text-xs text-gray-400">Nenhum fluxo selecionado</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {redirectConfig.flows.map((f) => (
                                <span
                                  key={f.id}
                                  className="flex items-center gap-1.5 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white"
                                >
                                  <Workflow className="h-3 w-3" />
                                  {f.name}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateRedirectConfig({
                                        flows: redirectConfig.flows.filter((x) => x.id !== f.id),
                                      })
                                    }
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
                            if (flow) updateRedirectConfig({ flows: [...redirectConfig.flows, flow] })
                          }}
                          disabled={availableFlows.length === 0}
                        >
                          <SelectTrigger className="mt-2 h-10 text-sm">
                            <SelectValue
                              placeholder={availableFlows.length === 0 ? "Nenhum fluxo disponivel" : "Adicionar fluxo..."}
                            />
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
                    </div>
                  )}

                  <div className="border-t border-gray-100 pt-5 mt-2">
                    <Label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-3 block">
                      Acoes Rapidas
                    </Label>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/s/${siteSlug}`, '_blank')}
                        className="justify-start h-10 text-sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Abrir Pagina
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = `${window.location.origin}/s/${siteSlug}`
                          navigator.clipboard.writeText(url)
                          toast.success("Link copiado!")
                        }}
                        className="justify-start h-10 text-sm"
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Copiar Link
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Pixel Tab */}
              <TabsContent value="pixel" className="absolute inset-0 p-4 m-0 overflow-y-auto data-[state=inactive]:hidden">
                <PixelConfigPanel
                  config={pixelConfig}
                  onChange={(config) => {
                    setPixelConfig(config)
                    setSaved(false)
                  }}
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center p-6 overflow-auto">
          {/* Phone Frame */}
          <div className="editor-canvas relative">
            <div className="w-[375px] h-[667px] bg-black rounded-[40px] p-2 shadow-2xl">
              <div className="w-full h-full rounded-[32px] overflow-hidden relative">
                {/* Preview Content */}
                {presellType === "age-verification" && (
                  <div 
                    className="w-full h-full flex items-center justify-center p-6"
                    style={{
                      backgroundColor: ageData.background.type === "color" ? ageData.background.color : undefined,
                      backgroundImage: ageData.background.type === "image" && ageData.background.imageMobile ? `url(${ageData.background.imageMobile})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="max-w-md w-full p-6 text-center">
                      <div className="mb-6 flex justify-center">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                        </svg>
                      </div>
                      <h1 className="text-2xl font-extrabold mb-6 text-gray-800">
                        {ageData.headline || "Voce tem 18 anos ou mais?"}
                      </h1>
                      <div className="flex flex-col gap-3">
                        <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors text-base w-full">
                          {ageData.yesButtonText || "TENHO 18"}
                        </button>
                        <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors text-base w-full">
                          {ageData.noButtonText || "NAO TENHO 18"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {presellType === "thank-you" && (
                  <div 
                    className="w-full h-full flex items-center justify-center p-4"
                    style={{
                      background: `linear-gradient(135deg, ${thankYouData.background.gradientFrom} 0%, ${thankYouData.background.gradientTo} 100%)`
                    }}
                  >
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-6 text-center">
                      <div className="mb-4 flex justify-center">
                        <div className="bg-green-100 p-3 rounded-full">
                          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                      </div>
                      <h1 className="text-2xl font-bold text-gray-800 mb-3">
                        {thankYouData.headline || "Muito Obrigado!"}
                      </h1>
                      <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                        {thankYouData.description || "Sua acao foi concluida com sucesso."}
                      </p>
                      <button 
                        className="w-full py-3 px-4 text-white font-semibold rounded-xl transition-colors shadow-lg text-sm"
                        style={{ backgroundColor: thankYouData.buttonColor }}
                      >
                        {thankYouData.buttonText || "Voltar para o Inicio"}
                      </button>
                      {thankYouData.footerText && (
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-400">
                            {thankYouData.footerText}{" "}
                            <span className="text-blue-500">{thankYouData.footerLinkText}</span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {presellType === "redirect" && (() => {
                  const bg = redirectData.background || { type: "color", color: "#0088cc", imageDesktop: "", imageMobile: "" }
                  return (
                  <div 
                    className="w-full h-full flex items-center justify-center bg-cover bg-center"
                    style={{ 
                      backgroundColor: bg.type === "color" ? bg.color : "#0088cc",
                      backgroundImage: bg.type === "image" && bg.imageMobile ? `url(${bg.imageMobile})` : undefined
                    }}
                  >
                    {redirectData.instantRedirect ? (
                      <div className="text-center px-6">
                        <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-4">
                          <ExternalLink className="w-6 h-6 text-white" />
                        </div>
                        <p className="text-white text-sm font-medium mb-1">
                          Redirecionamento automatico
                        </p>
                        <p className="text-white/70 text-xs">
                          A tela nao sera exibida para o visitante.
                        </p>
                      </div>
                    ) : (
                    <div className="text-center">
                      {/* Circulo com logo do Telegram */}
                      <div 
                        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl"
                        style={{ background: "linear-gradient(180deg, #24A1DE 0%, #1c82b1 100%)" }}
                      >
                        <img 
                          src="/telegram-white.png" 
                          alt="Telegram" 
                          className="w-10 h-10 object-contain"
                        />
                      </div>
                      {/* Spinner */}
                      <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                      {/* Texto */}
                      <p className="text-white text-base font-medium mb-3">
                        {redirectData.message || "Redirecionando..."}
                      </p>
                      <p className="text-white/80 text-xs underline">
                        {redirectData.fallbackText || "Clique aqui se nao for redirecionado"}
                      </p>
                    </div>
                    )}
                  </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
