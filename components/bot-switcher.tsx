"use client"

import { useState } from "react"
import { useBots } from "@/lib/bot-context"
import { Bot, ChevronDown, Plus, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CreateBotWizard } from "@/components/create-bot-wizard"

export function BotSwitcher({ collapsed }: { collapsed: boolean }) {
  const { bots, selectedBot, setSelectedBot, addBot } = useBots()
  const [open, setOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

  async function handleCreateBot(data: {
    name: string
    token: string
    username?: string
    telegram_bot_id?: string
    photo_url?: string
    group_name?: string
    group_id?: string
    group_link?: string
  }) {
    const createdBot = await addBot(data)
    await fetch("/api/telegram/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ botToken: createdBot.token, action: "register" }),
    })
  }

  if (bots.length === 0) {
    return (
      <>
        <button
          onClick={() => setWizardOpen(true)}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-dashed border-[#2a2a2e] px-3 py-2.5 text-sm text-gray-400 transition-colors hover:border-[#a3e635] hover:text-[#a3e635]",
            collapsed ? "justify-center" : "w-full"
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Criar bot</span>}
        </button>
        <CreateBotWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onCreateBot={handleCreateBot}
          isNewUser={true}
        />
      </>
    )
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 rounded-lg bg-[#1c1c1e] border border-[#2a2a2e] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2e] w-full",
              collapsed && "justify-center px-2"
            )}
          >
            {!collapsed && (
              <>
                <span className="truncate flex-1 text-left">Gerenciar Bots</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              </>
            )}
            {collapsed && (
              <Bot className="h-4 w-4 text-gray-500" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-[#1c1c1e] border-[#2a2a2e] text-white">
          {bots.map((bot) => (
            <DropdownMenuItem
              key={bot.id}
              onClick={() => {
                setSelectedBot(bot)
                setOpen(false)
              }}
              className={cn(
                "flex items-center gap-2 cursor-pointer text-white focus:bg-[#2a2a2e] focus:text-white",
                selectedBot?.id === bot.id && "bg-[#2a2a2e]"
              )}
            >
              <Circle
                className={cn(
                  "h-2 w-2 shrink-0",
                  bot.status === "active" ? "fill-[#a3e635] text-[#a3e635]" : "fill-gray-400 text-gray-400"
                )}
              />
              <span className="truncate">{bot.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-[#2a2a2e]" />
          <DropdownMenuItem
            onClick={() => {
              setOpen(false)
              setWizardOpen(true)
            }}
            className="flex items-center gap-2 cursor-pointer text-[#a3e635] focus:bg-[#2a2a2e] focus:text-[#a3e635]"
          >
            <Plus className="h-3 w-3" />
            <span>Criar novo bot</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateBotWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onCreateBot={handleCreateBot}
      />
    </>
  )
}
