import { getSupabaseAdmin } from "@/lib/supabase"

// ---------------------------------------------------------------------------
// Logger de erros centralizado
//
// Grava erros na tabela `error_logs` do Supabase para consulta posterior.
// NUNCA lanca excecao: se o log falhar, apenas registra no console para nao
// quebrar o fluxo principal (ex: geracao de PIX).
// ---------------------------------------------------------------------------

export interface LogErrorInput {
  /** De onde veio o erro. Ex: 'pix-generation', 'telegram-tester', 'webhook'. */
  source: string
  /** Mensagem exata do erro. */
  message: string
  /** Contexto legivel. Ex: "gateway=nexuspag amount=9.9 bot=...". */
  context?: string
  /** Dados extras (resposta da API, stack, etc.). */
  details?: Record<string, unknown>
}

export async function logError(input: LogErrorInput): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("error_logs").insert({
      source: input.source,
      message: input.message,
      context: input.context ?? null,
      details: input.details ? (input.details as Record<string, unknown>) : null,
    })
    if (error) {
      console.error("[error-logger] falha ao gravar erro:", error.message)
    }
  } catch (err) {
    console.error("[error-logger] excecao ao gravar erro:", err)
  }
}
