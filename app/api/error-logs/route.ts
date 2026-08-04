import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Rota de log de erros
//
// GET    /api/error-logs?source=&resolved=&limit=  -> lista os erros
// PATCH  /api/error-logs   { id, resolved }         -> marca 1 erro resolvido
// DELETE /api/error-logs?id=...                     -> apaga 1 erro
// DELETE /api/error-logs?all=1                      -> apaga TODOS os erros
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const supabase = getSupabaseAdmin()
  const params = request.nextUrl.searchParams
  const source = params.get("source")
  const resolved = params.get("resolved")
  const limit = Math.min(Number(params.get("limit")) || 100, 500)

  let query = supabase
    .from("error_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (source) query = query.eq("source", source)
  if (resolved === "true") query = query.eq("resolved", true)
  if (resolved === "false") query = query.eq("resolved", false)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const unresolved = (data || []).filter((e) => !e.resolved).length

  return NextResponse.json({ errors: data || [], total: data?.length || 0, unresolved })
}

export async function PATCH(request: NextRequest) {
  let body: { id?: string; resolved?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: "id e obrigatorio" }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from("error_logs")
    .update({ resolved: body.resolved ?? true })
    .eq("id", body.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = getSupabaseAdmin()
  const params = request.nextUrl.searchParams
  const id = params.get("id")
  const all = params.get("all")

  if (all === "1") {
    // Apaga tudo. .neq com um uuid impossivel garante que o filtro cubra todas as linhas.
    const { error } = await supabase
      .from("error_logs")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000")
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  if (!id) {
    return NextResponse.json({ error: "id ou all=1 e obrigatorio" }, { status: 400 })
  }

  const { error } = await supabase.from("error_logs").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
