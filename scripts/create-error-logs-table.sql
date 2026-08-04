-- ---------------------------------------------------------------------------
-- Tabela de log de erros (PIX, gateways, simulacao, webhook, etc.)
--
-- Guarda TODOS os erros que acontecem no sistema (principalmente falhas ao
-- gerar PIX) para consulta posterior. Use a rota /api/error-logs e o painel
-- na pagina /telegram-tester para visualizar e limpar os erros.
-- ---------------------------------------------------------------------------

create table if not exists public.error_logs (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  source        text not null,              -- ex: 'pix-generation', 'telegram-tester', 'webhook'
  context       text,                       -- ex: gateway, bot_id, flow_id, amount
  message       text not null,              -- mensagem exata do erro
  details       jsonb,                      -- payload extra (stack, resposta da API, etc.)
  resolved      boolean not null default false
);

create index if not exists error_logs_created_at_idx on public.error_logs (created_at desc);
create index if not exists error_logs_source_idx on public.error_logs (source);
create index if not exists error_logs_resolved_idx on public.error_logs (resolved);

-- O acesso e feito pela service role key (bypassa RLS), entao nao precisa de
-- policies. Mantemos RLS habilitado por seguranca.
alter table public.error_logs enable row level security;
