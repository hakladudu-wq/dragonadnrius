import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://sfysxgcxitsewjwjtorz.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeXN4Z2N4aXRzZXdqd2p0b3J6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjUwOTA3OSwiZXhwIjoyMTAyMDg1MDc5fQ.Jg0SOEj3VQ-xd7BIBoFcarS9QF-fI1rcFNAhJlW_3Wo"

const WHATSAPP_KEY = "support_whatsapp_contacts"

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export interface WhatsappContact {
  id: string
  name: string
  number: string
}

// GET - lista os contatos de WhatsApp de suporte
export async function GET() {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", WHATSAPP_KEY)
    .single()

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const contacts = (data?.value as WhatsappContact[] | undefined) ?? []
  return NextResponse.json({ contacts })
}

// POST - substitui a lista completa de contatos (usado pelo painel admin)
export async function POST(request: NextRequest) {
  const supabase = getSupabaseAdmin()

  try {
    const body = await request.json()
    const contacts = body.contacts

    if (!Array.isArray(contacts)) {
      return NextResponse.json({ error: "contacts deve ser uma lista" }, { status: 400 })
    }

    // Normaliza/valida os contatos
    const sanitized: WhatsappContact[] = contacts
      .map((c: Partial<WhatsappContact>) => ({
        id: c.id || crypto.randomUUID(),
        name: String(c.name || "").trim(),
        number: String(c.number || "").replace(/\D/g, ""),
      }))
      .filter((c) => c.name && c.number)

    const { error } = await supabase.from("platform_settings").upsert(
      {
        key: WHATSAPP_KEY,
        value: sanitized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contacts: sanitized })
  } catch {
    return NextResponse.json({ error: "Requisicao invalida" }, { status: 400 })
  }
}
