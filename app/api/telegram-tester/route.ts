import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { runSimulation } from "@/lib/telegram-simulation"
import { processUpdate } from "@/app/api/telegram/webhook/[botId]/route"
import { testerLog } from "@/lib/logger"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// ---------------------------------------------------------------------------
// Testador de Fluxos (motor real do webhook, em modo simulacao)
//
// Acesso livre (sem chave). Lista bots e fluxos direto do banco.
//
// GET  /api/telegram-tester            -> lista bots e fluxos
// POST /api/telegram-tester   { ... }  -> roda um update no motor real
// ---------------------------------------------------------------------------

/** Extrai o prefixo numerico do token do bot (parte antes do ":"). */
function tokenPrefix(token: string | null | undefined): string | null {
  if (!token) return null
  const idx = token.indexOf(":")
  return idx > 0 ? token.slice(0, idx) : token
}

// ---------------------------------------------------------------------------
// GET: lista bots e fluxos vinculados
// ---------------------------------------------------------------------------
export async function GET(_request: NextRequest) {
  const supabase = getSupabaseAdmin()

  const { data: bots, error: botsError } = await supabase
    .from("bots")
    .select("id, name, token, status")
    .order("created_at", { ascending: false })
    .limit(100)

  if (botsError) {
    return NextResponse.json({ error: botsError.message }, { status: 500 })
  }

  const { data: flows } = await supabase
    .from("flows")
    .select("id, name, status, bot_id")
    .order("updated_at", { ascending: false })
    .limit(200)

  const { data: flowBots } = await supabase.from("flow_bots").select("flow_id, bot_id")

  // Monta bots com os fluxos vinculados (via flow_bots + bot_id direto no flow)
  const botsOut = (bots || []).map((b) => {
    const linkedFlowIds = new Set<string>()
    ;(flowBots || []).forEach((fb) => {
      if (fb.bot_id === b.id && fb.flow_id) linkedFlowIds.add(fb.flow_id as string)
    })
    ;(flows || []).forEach((f) => {
      if (f.bot_id === b.id) linkedFlowIds.add(f.id as string)
    })
    const botFlows = (flows || [])
      .filter((f) => linkedFlowIds.has(f.id as string))
      .map((f) => ({ id: f.id, name: f.name, status: f.status }))
    return {
      id: b.id,
      name: b.name,
      status: b.status,
      hasToken: !!b.token,
      flows: botFlows,
    }
  })

  return NextResponse.json({
    bots: botsOut,
    // Todos os fluxos disponiveis (caso o usuario queira forcar um fluxo sem vinculo)
    allFlows: (flows || []).map((f) => ({ id: f.id, name: f.name, status: f.status, botId: f.bot_id })),
  })
}

// ---------------------------------------------------------------------------
// POST: roda um update no motor real, em modo simulacao
// ---------------------------------------------------------------------------
interface RunBody {
  botId: string // uuid do bot
  flowId?: string // fluxo a forcar (opcional)
  action: "start" | "callback" | "text"
  callbackData?: string
  text?: string
  session: {
    userId: number
    chatId: number
    firstName?: string
    username?: string
    lastMessageId?: number
  }
}

export async function POST(request: NextRequest) {
  let body: RunBody
  try {
    body = (await request.json()) as RunBody
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 })
  }

  if (!body.botId || !body.session?.userId) {
    return NextResponse.json({ error: "botId e session sao obrigatorios" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: bot } = await supabase
    .from("bots")
    .select("id, token")
    .eq("id", body.botId)
    .single()

  if (!bot) {
    return NextResponse.json({ error: "Bot nao encontrado" }, { status: 404 })
  }

  const prefix = tokenPrefix(bot.token as string)
  if (!prefix) {
    return NextResponse.json({ error: "Bot sem token valido" }, { status: 400 })
  }

  const { userId, chatId, firstName = "Testador", username = "testador", lastMessageId } = body.session
  const now = Math.floor(Date.now() / 1000)
  const from = { id: userId, is_bot: false, first_name: firstName, username }

  // Monta o update do Telegram conforme a acao
  let update: Record<string, unknown>
  if (body.action === "callback") {
    update = {
      update_id: now,
      callback_query: {
        id: String(now),
        from,
        message: {
          message_id: lastMessageId || 1,
          chat: { id: chatId, type: "private" },
          from: { id: 1, is_bot: true, first_name: "Bot" },
        },
        data: body.callbackData || "",
      },
    }
  } else {
    const text = body.action === "start" ? "/start" : body.text || ""
    update = {
      update_id: now,
      message: {
        message_id: (lastMessageId || 0) + 1,
        chat: { id: chatId, type: "private" },
        from,
        text,
        date: now,
      },
    }
  }

  try {
    const captures = await runSimulation(() => processUpdate(prefix, update), {
      flowOverrideId: body.flowId,
    })
    return NextResponse.json({ ok: true, captures })
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err)
    const errStack = err instanceof Error ? err.stack : undefined
    console.error("[telegram-tester] erro ao rodar update:", err)
    // Grava o erro no banco (debug_logs) com o contexto do teste,
    // para ficar registrado e ser resolvido depois.
    await testerLog.error(`Erro na simulação (${body.action}): ${errMsg}`, {
      action: body.action,
      callbackData: body.callbackData,
      text: body.text,
      stack: errStack,
    }, { bot_id: body.botId, flow_id: body.flowId, telegram_user_id: body.session.userId })
    return NextResponse.json({ error: errMsg, detail: errStack }, { status: 500 })
  }
}
