import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

// Log de atividades em tempo real para a dashboard.
// Junta os eventos mais recentes do bot:
//  - novos leads (usuarios que iniciaram o bot)
//  - PIX gerados (pagamentos pendentes)
//  - pagamentos confirmados (pagamentos aprovados)
export async function GET(req: NextRequest) {
  const supabase = getSupabase()
  try {
    const { searchParams } = new URL(req.url)
    const botId = searchParams.get("bot_id")
    const limit = parseInt(searchParams.get("limit") || "25")

    if (!botId) {
      return NextResponse.json({ error: "bot_id is required" }, { status: 400 })
    }

    // Buscar usuarios recentes do bot (novos leads)
    const { data: users } = await supabase
      .from("bot_users")
      .select("id, telegram_user_id, first_name, last_name, username, created_at")
      .eq("bot_id", botId)
      .order("created_at", { ascending: false })
      .limit(limit)

    // Buscar pagamentos recentes do bot (gerados / confirmados)
    const { data: payments } = await supabase
      .from("payments")
      .select("id, telegram_user_id, amount, status, created_at")
      .eq("bot_id", botId)
      .order("created_at", { ascending: false })
      .limit(limit)

    // Mapa de nomes por telegram_user_id (para enriquecer os pagamentos)
    const nameMap: Record<string, string> = {}
    for (const u of users || []) {
      const nome = [u.first_name, u.last_name].filter(Boolean).join(" ") || (u.username ? `@${u.username}` : "Usuário")
      nameMap[String(u.telegram_user_id)] = nome
    }

    type Event = {
      id: string
      type: "novo_lead" | "pix_gerado" | "pagamento"
      name: string
      description: string
      amount: number | null
      timestamp: string
    }

    const events: Event[] = []

    // Novos leads
    for (const u of users || []) {
      const nome = [u.first_name, u.last_name].filter(Boolean).join(" ") || (u.username ? `@${u.username}` : "Usuário")
      events.push({
        id: `lead-${u.id}`,
        type: "novo_lead",
        name: nome,
        description: "Iniciou conversa",
        amount: null,
        timestamp: u.created_at,
      })
    }

    // Pagamentos (gerados / confirmados)
    for (const p of payments || []) {
      const nome = nameMap[String(p.telegram_user_id)] || "Usuário"
      const valor = Number(p.amount) || 0
      if (p.status === "approved") {
        events.push({
          id: `pay-${p.id}`,
          type: "pagamento",
          name: nome,
          description: `Pagou R$ ${valor.toFixed(2).replace(".", ",")}`,
          amount: valor,
          timestamp: p.created_at,
        })
      } else if (p.status === "pending") {
        events.push({
          id: `pix-${p.id}`,
          type: "pix_gerado",
          name: nome,
          description: `Gerou PIX de R$ ${valor.toFixed(2).replace(".", ",")}`,
          amount: valor,
          timestamp: p.created_at,
        })
      }
    }

    // Ordenar por data (mais recente primeiro) e limitar
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ events: events.slice(0, limit) })
  } catch (err) {
    console.error("[activity] Error:", err)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
