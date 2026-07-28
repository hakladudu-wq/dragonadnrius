import { v4 as uuidv4 } from "uuid"
import type { CreatePixPaymentInput, PixPaymentResult } from "./mercadopago"

// ---------------------------------------------------------------------------
// NexusPag - usa EXATAMENTE a mesma interface do Mercado Pago
// (mesmo CreatePixPaymentInput / PixPaymentResult), para reaproveitar todas
// as rotas e o mesmo banco de dados (tabela user_gateways / payments).
//
// Diferencas da API NexusPag em relacao ao Mercado Pago:
// - Autenticacao via header "x-api-key" (o access_token salvo e a chave nxp_...)
// - amount vem em CENTAVOS (aqui recebemos em REAIS, entao convertemos)
// - Resposta em data.transaction { id, pix_copia_cola, qr_code_base64, status }
// ---------------------------------------------------------------------------

const NEXUSPAG_API_URL = process.env.NEXUSPAG_API_URL || "https://nexuspag.com/api"

// Mapeia o status da NexusPag para o mesmo vocabulario usado pelo resto do
// sistema (que foi feito para o Mercado Pago).
function mapNexusStatus(status?: string): string {
  switch ((status || "").toLowerCase()) {
    case "paid":
    case "approved":
    case "completed":
      return "approved"
    case "expired":
      return "cancelled"
    case "refunded":
      return "refunded"
    case "pending":
    default:
      return "pending"
  }
}

export async function createPixPayment(input: CreatePixPaymentInput): Promise<PixPaymentResult> {
  const { accessToken, amount, description, notificationUrl } = input

  // Mesma URL de webhook usada pelo Mercado Pago - reaproveita a mesma rota.
  const webhookUrl =
    notificationUrl ||
    `${process.env.NEXT_PUBLIC_APP_URL || "https://dragonbot-h5uz.onrender.com"}/api/payments/webhook/mercadopago`

  // NexusPag espera o valor em centavos. Aqui o valor chega em reais (igual ao MP).
  const amountInCents = Math.round(Number(amount) * 100)

  try {
    const response = await fetch(`${NEXUSPAG_API_URL}/pix/create`, {
      method: "POST",
      headers: {
        "x-api-key": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInCents,
        description: description,
        external_id: `pix-${uuidv4()}`,
        webhook_url: webhookUrl,
        expiration: 1800,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("[v0] NexusPag API error:", response.status, errorData)
      return {
        success: false,
        paymentId: "",
        qrCode: "",
        qrCodeUrl: "",
        copyPaste: "",
        status: "error",
        error: errorData.error || errorData.message || `Erro na API: ${response.status}`,
      }
    }

    const data = await response.json()
    const transaction = data.transaction || data

    const copyPaste: string = transaction.pix_copia_cola || transaction.pixCopiaCola || ""
    if (!copyPaste) {
      return {
        success: false,
        paymentId: "",
        qrCode: "",
        qrCodeUrl: "",
        copyPaste: "",
        status: "error",
        error: "Nao foi possivel gerar o codigo PIX",
      }
    }

    // Gera a URL do QR Code usando o mesmo servico externo do Mercado Pago,
    // para que o Telegram consiga renderizar a imagem via URL.
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(copyPaste)}`

    return {
      success: true,
      paymentId: String(transaction.id || transaction.txid || ""),
      qrCode: copyPaste,
      qrCodeUrl: qrCodeUrl,
      copyPaste: copyPaste,
      status: mapNexusStatus(transaction.status),
    }
  } catch (error) {
    console.error("[v0] Error creating NexusPag payment:", error)
    return {
      success: false,
      paymentId: "",
      qrCode: "",
      qrCodeUrl: "",
      copyPaste: "",
      status: "error",
      error: error instanceof Error ? error.message : "Erro desconhecido",
    }
  }
}

// A NexusPag confirma o pagamento via webhook (pix.paid / pix.expired) e nao
// documenta um endpoint de consulta. Retornamos "pending" para que o chamador
// use o status ja gravado no banco (atualizado pelo webhook).
export async function checkPaymentStatus(_accessToken: string, _paymentId: string): Promise<string> {
  return "pending"
}
