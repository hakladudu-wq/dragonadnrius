"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/lib/auth-context"
import { Shuffle, Plus, ExternalLink, Copy, Edit3, Trash2, MoreHorizontal, Loader2, Eye } from "lucide-react"
import { toast } from "sonner"
import { CreateRedirectModal } from "@/components/redirect/create-redirect-modal"

type RedirectSite = {
  id: string
  nome: string
  slug: string
  views: number
  created_at: string
  presell_type?: string
}

function isRedirect(site: any): boolean {
  return site?.presell_type === "redirect" || (typeof site?.slug === "string" && site.slug.startsWith("presell-redirect"))
}

export default function RedirecionamentoPage() {
  const { session } = useAuth()
  const router = useRouter()
  const [sites, setSites] = useState<RedirectSite[]>([])
  const [loading, setLoading] = useState(true)
  const [origin, setOrigin] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    if (session?.userId) fetchSites()
  }, [session?.userId])

  const fetchSites = async () => {
    if (!session?.userId) return
    try {
      setLoading(true)
      const res = await fetch(`/api/dragon-bio?userId=${session.userId}`)
      const data = await res.json()
      if (data.sites) {
        setSites(data.sites.filter(isRedirect))
      }
    } catch (error) {
      console.error("Erro ao carregar redirects:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreated = (siteId: string) => {
    fetchSites()
    router.push(`/presell-editor/${siteId}?type=redirect`)
  }

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`${origin}/s/${slug}`)
    toast.success("Link copiado!")
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/dragon-bio?siteId=${id}`, { method: "DELETE" })
      if (!res.ok) {
        toast.error("Erro ao excluir redirect")
        return
      }
      toast.success("Redirect excluido!")
      setSites((prev) => prev.filter((s) => s.id !== id))
    } catch (error) {
      console.error("Erro ao excluir redirect:", error)
      toast.error("Erro ao excluir redirect")
    }
  }

  const totalRedirects = sites.length
  const totalViews = sites.reduce((acc, s) => acc + (s.views || 0), 0)

  return (
    <ScrollArea className="flex-1">
      <div className="min-h-full p-4 sm:p-6 lg:p-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Shuffle className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground text-balance">Redirecionamento</h1>
                <p className="text-sm text-muted-foreground">Crie paginas de redirect automatico e ferramentas de link.</p>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Redirect
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Redirects ativos</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{totalRedirects}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Visitas totais</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{totalViews.toLocaleString("pt-BR")}</p>
            </div>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : totalRedirects === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Shuffle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Nenhum redirect criado</h3>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Crie sua primeira pagina de redirecionamento automatico para enviar seus leads direto para a oferta.
                </p>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold rounded-xl"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Redirect
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-accent/40"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Shuffle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-foreground">{site.nome}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="truncate">/s/{site.slug}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {(site.views || 0).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/presell-editor/${site.id}?type=redirect`)}
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      aria-label="Editar"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`${origin}/s/${site.slug}`, "_blank")}
                      className="h-9 w-9 text-muted-foreground hover:text-foreground"
                      aria-label="Abrir"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Mais opcoes">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopyLink(site.slug)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar link
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(site.id)} className="text-red-500 focus:text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateRedirectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        userId={session?.userId}
        userEmail={session?.email}
        userName={session?.name}
        origin={origin}
        onCreated={handleCreated}
      />
    </ScrollArea>
  )
}
