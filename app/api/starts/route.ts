import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Calcula o range de datas com base no periodo (mesma logica do dashboard)
function getStartDate(period: string): string | null {
  const now = new Date()

  switch (period) {
    case "today": {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      return start.toISOString()
    }
    case "yesterday": {
      const start = new Date(now)
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      return start.toISOString()
    }
    case "7days": {
      const start = new Date(now)
      start.setDate(start.getDate() - 7)
      return start.toISOString()
    }
    case "30days":
    case "month": {
      const start = new Date(now)
      start.setDate(start.getDate() - 30)
      return start.toISOString()
    }
    case "total":
    default:
      return null
  }
}

function getEndDate(period: string): string | null {
  if (period === "yesterday") {
    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() - 1)
    end.setHours(23, 59, 59, 999)
    return end.toISOString()
  }
  return null
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  try {
    const { searchParams } = new URL(req.url)
    const botId = searchParams.get("bot_id")
    const period = searchParams.get("period") || "total"

    if (!botId) {
      return NextResponse.json({ error: "bot_id is required" }, { status: 400 })
    }

    // Conta o total de starts (usuarios que iniciaram conversa) sem limite de linhas
    let query = supabase
      .from("bot_users")
      .select("*", { count: "exact", head: true })
      .eq("bot_id", botId)

    const startDate = getStartDate(period)
    const endDate = getEndDate(period)

    if (startDate) {
      query = query.gte("created_at", startDate)
    }
    if (endDate) {
      query = query.lte("created_at", endDate)
    }

    const { count, error } = await query

    if (error) {
      console.error("[starts] Error counting bot_users:", error)
      return NextResponse.json({ error: error.message, total: 0 }, { status: 500 })
    }

    return NextResponse.json({ total: count || 0 })
  } catch (err) {
    console.error("[starts] Error:", err)
    return NextResponse.json({ error: "Internal error", total: 0 }, { status: 500 })
  }
}
