import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("[v0] DragonAdmin Ranking API - Starting fetch")

    // Buscar todos os usuarios
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from("users")
      .select("id, email, name, created_at")

    if (usersError) {
      console.error("[v0] Ranking - erro ao buscar users:", usersError.message)
      return NextResponse.json({ error: "Erro ao buscar usuarios" }, { status: 500 })
    }

    // Buscar todos os pagamentos aprovados
    const { data: allPayments, error: paymentsError } = await supabaseAdmin
      .from("payments")
      .select("user_id, amount, status")
      .eq("status", "approved")

    if (paymentsError) {
      console.error("[v0] Ranking - erro ao buscar payments:", paymentsError.message)
    }

    console.log("[v0] Ranking - users:", usersData?.length, "payments:", allPayments?.length)

    // Agregar faturamento e total de vendas por usuario
    const statsByUser: Record<string, { revenue: number; sales: number }> = {}
    allPayments?.forEach((p) => {
      if (!p.user_id) return
      if (!statsByUser[p.user_id]) {
        statsByUser[p.user_id] = { revenue: 0, sales: 0 }
      }
      statsByUser[p.user_id].revenue += Number(p.amount) || 0
      statsByUser[p.user_id].sales += 1
    })

    // Montar ranking apenas com usuarios que tem vendas
    const ranking = (usersData || [])
      .map((user) => {
        const stats = statsByUser[user.id] || { revenue: 0, sales: 0 }
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          created_at: user.created_at,
          revenue: stats.revenue,
          sales: stats.sales,
        }
      })
      .filter((u) => u.sales > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .map((u, index) => ({ ...u, position: index + 1 }))

    const totalRevenue = ranking.reduce((acc, u) => acc + u.revenue, 0)
    const totalSales = ranking.reduce((acc, u) => acc + u.sales, 0)

    return NextResponse.json({
      ranking,
      summary: {
        totalUsers: ranking.length,
        totalRevenue,
        totalSales,
      },
    })
  } catch (error) {
    console.error("[v0] DragonAdmin Ranking - Error:", error)
    return NextResponse.json({ error: "Erro ao gerar ranking" }, { status: 500 })
  }
}
