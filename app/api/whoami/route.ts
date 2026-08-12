import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const SUPABASE_URL = "https://sfysxgcxitsewjwjtorz.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmeXN4Z2N4aXRzZXdqd2p0b3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MDkwNzksImV4cCI6MjEwMjA4NTA3OX0.k9AunToqaMM0EPNFyaEvKea5XbUF9s21Z9QpKasAUAo"

export async function GET() {
  try {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    })
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json({ 
        error: "Nao autenticado",
        tip: "Faca login em /login primeiro"
      })
    }
    
    return NextResponse.json({
      userId: user.id,
      email: user.email,
      name: user.user_metadata?.name || null,
      tip: "Use este userId para testar: /api/test-payment-insert?userId=" + user.id
    })
  } catch (err) {
    return NextResponse.json({ error: "Erro: " + String(err) })
  }
}
