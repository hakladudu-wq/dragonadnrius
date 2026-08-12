import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://sfysxgcxitsewjwjtorz.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeXN4Z2N4aXRzZXdqd2p0b3J6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUwOTA3OSwiZXhwIjoyMTAyMDg1MDc5fQ.Jg0SOEj3VQ-xd7BIBoFcarS9QF-fI1rcFNAhJlW_3Wo"

const REPORT_PREFIX = "support_report:"

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface SupportReport {
  id: string
  name: string
  reason: string
  message: string
  reporter_user_id: string | null
  status: "pending" | "reviewed" | "resolved"
  created_at: string
}

const REASONS = [
  "Uso indevido da plataforma",
  "Conteudo proibido",
  "Golpe ou fraude",
  "Comportamento abusivo",
  "Problema tecnico",
  "Outro",
]

// GET - lista todos os relatos (painel admin)
export async function GET() {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from("platform_settings")
    .select("key, value, updated_at")
    .like("key", `${REPORT_PREFIX}%`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const reports = (data || [])
    .map((row) => row.value as SupportReport)
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json({ reports })
}

// POST - cria um novo relato (enviado pelo usuario)
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin()

  try {
    const body = await request.json()
    const name = String(body.name || "").trim() || "Anonimo"
    const reason = String(body.reason || "").trim()
    const message = String(body.message || "").trim()
    const reporterUserId = body.reporterUserId ? String(body.reporterUserId) : null

    if (!reason || !REASONS.includes(reason)) {
      return NextResponse.json({ error: "Motivo invalido" }, { status: 400 })
    }
    if (message.length < 5) {
      return NextResponse.json({ error: "Descreva melhor o que esta acontecendo" }, { status: 400 })
    }

    const report: SupportReport = {
      id: crypto.randomUUID(),
      name,
      reason,
      message,
      reporter_user_id: reporterUserId,
      status: "pending",
      created_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("platform_settings").insert({
      key: `${REPORT_PREFIX}${report.id}`,
      value: report,
      updated_at: report.created_at,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ report })
  } catch {
    return NextResponse.json({ error: "Requisicao invalida" }, { status: 400 })
  }
}

// PATCH - atualiza o status de um relato (painel admin)
export async function PATCH(request: NextRequest) {
  const supabase = getSupabaseAdmin()

  try {
    const body = await request.json()
    const id = String(body.id || "")
    const status = String(body.status || "")

    if (!id || !["pending", "reviewed", "resolved"].includes(status)) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 })
    }

    const key = `${REPORT_PREFIX}${id}`
    const { data, error: fetchError } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", key)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: "Relato nao encontrado" }, { status: 404 })
    }

    const updated = { ...(data.value as SupportReport), status }

    const { error } = await supabase
      .from("platform_settings")
      .update({ value: updated, updated_at: new Date().toISOString() })
      .eq("key", key)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ report: updated })
  } catch {
    return NextResponse.json({ error: "Requisicao invalida" }, { status: 400 })
  }
}

// DELETE - remove um relato (painel admin)
export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseAdmin()

  const id = request.nextUrl.searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id obrigatorio" }, { status: 400 })
  }

  const { error } = await supabase
    .from("platform_settings")
    .delete()
    .eq("key", `${REPORT_PREFIX}${id}`)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
