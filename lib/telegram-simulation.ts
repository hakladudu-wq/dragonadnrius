import { AsyncLocalStorage } from "node:async_hooks"

// ---------------------------------------------------------------------------
// Simulador do Telegram
//
// Permite rodar EXATAMENTE o mesmo fluxo do webhook do bot, porem sem enviar
// nada para a API real do Telegram. Quando uma simulacao esta ativa, as funcoes
// de envio (sendTelegramMessage, sendTelegramPhoto, etc.) capturam o que seria
// enviado em vez de disparar para o Telegram. Assim conseguimos ver as respostas
// do bot (incluindo o PIX gerado) direto numa pagina de teste.
// ---------------------------------------------------------------------------

export interface CapturedButton {
  text: string
  callback_data?: string
  url?: string
}

export interface CapturedMessage {
  kind: "text" | "photo" | "video" | "edit"
  text?: string
  mediaUrl?: string
  buttons?: CapturedButton[][]
  messageId?: number
}

interface SimulationContext {
  captures: CapturedMessage[]
  /** Se definido, o motor deve usar este fluxo em vez do fluxo ativo do bot. */
  flowOverrideId?: string
  /** Contador de message_id sinteticos (Telegram nao esta envolvido na simulacao). */
  messageIdCounter: number
}

const simulationStore = new AsyncLocalStorage<SimulationContext>()

export interface RunSimulationOptions {
  /** Forca o motor a rodar um fluxo especifico (para testar um fluxo escolhido). */
  flowOverrideId?: string
}

/** Executa `fn` dentro de um contexto de simulacao e retorna as mensagens capturadas. */
export async function runSimulation(
  fn: () => Promise<void>,
  opts: RunSimulationOptions = {},
): Promise<CapturedMessage[]> {
  const ctx: SimulationContext = {
    captures: [],
    flowOverrideId: opts.flowOverrideId,
    messageIdCounter: 1000,
  }
  await simulationStore.run(ctx, fn)
  return ctx.captures
}

/** Retorna true se estamos dentro de uma simulacao (envios devem ser capturados). */
export function isSimulating(): boolean {
  return simulationStore.getStore() !== undefined
}

/** Retorna o id do fluxo que deve ser forcado na simulacao, se houver. */
export function getSimFlowOverride(): string | undefined {
  return simulationStore.getStore()?.flowOverrideId
}

/** Gera um message_id sintetico e crescente durante a simulacao. */
export function nextSimMessageId(): number {
  const store = simulationStore.getStore()
  if (!store) return Math.floor(Math.random() * 1_000_000)
  store.messageIdCounter += 1
  return store.messageIdCounter
}

/** Normaliza um replyMarkup do Telegram para a lista de botoes capturada. */
function normalizeButtons(replyMarkup?: unknown): CapturedButton[][] | undefined {
  if (!replyMarkup || typeof replyMarkup !== "object") return undefined
  const inline = (replyMarkup as Record<string, unknown>).inline_keyboard
  if (!Array.isArray(inline)) return undefined
  return inline.map((row) =>
    (Array.isArray(row) ? row : []).map((btn) => {
      const b = (btn || {}) as Record<string, unknown>
      return {
        text: String(b.text ?? ""),
        callback_data: typeof b.callback_data === "string" ? b.callback_data : undefined,
        url: typeof b.url === "string" ? b.url : undefined,
      }
    })
  )
}

/** Registra uma mensagem que o bot "enviaria". Chamado pelas funcoes de envio. */
export function captureOutgoing(
  kind: CapturedMessage["kind"],
  opts: { text?: string; mediaUrl?: string; replyMarkup?: unknown; messageId?: number },
) {
  const store = simulationStore.getStore()
  if (!store) return
  store.captures.push({
    kind,
    text: opts.text,
    mediaUrl: opts.mediaUrl,
    buttons: normalizeButtons(opts.replyMarkup),
    messageId: opts.messageId,
  })
}
