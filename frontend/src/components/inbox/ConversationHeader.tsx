'use client'

import {
  Archive,
  BellOff,
  Bot,
  ChevronDown,
  ExternalLink,
  MoreHorizontal,
  Phone,
  Star,
  Trash2,
  User,
  UserPlus,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface TeamMember {
  id: string
  name: string
  role: string
}

interface ConversationHeaderProps {
  conversation: {
    id: string
    contactName: string
    contactPhone: string
    contactInitials: string
    contactColor: string
    handledBy: 'ai' | 'human'
    leadScore: number
    leadTier: 'VIP' | 'HOT' | 'WARM' | 'COLD'
    isStarred: boolean
    assignedAgentName?: string | null
    language: 'en' | 'ar'
    messageCount: number
  }
  teamMembers: TeamMember[]
  onHandoffToggle: () => void
  onAssign: (teamMemberId: string) => void
  onArchive: () => void
  onDelete: () => void
  onStar: () => void
}

function LeadScoreDot({ score }: { score: number }) {
  const activeClass = score >= 8 ? 'bg-[#FF4545]' : score >= 5 ? 'bg-[#D4A017]' : 'bg-[#25D453]'

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 10 }).map((_, index) => (
        <div
          key={index}
          className={cn('h-1.5 w-1.5 rounded-full', index < score ? activeClass : 'bg-white/10')}
        />
      ))}
    </div>
  )
}

export function ConversationHeader({
  conversation,
  teamMembers,
  onArchive,
  onAssign,
  onDelete,
  onHandoffToggle,
  onStar,
}: ConversationHeaderProps) {
  const tierColors = {
    VIP: 'border-[#D4A017]/30 bg-[#D4A017]/15 text-[#D4A017]',
    HOT: 'border-[#FF4545]/30 bg-[#FF4545]/15 text-[#FF4545]',
    WARM: 'border-[#25D453]/30 bg-[#25D453]/15 text-[#25D453]',
    COLD: 'border-white/10 bg-white/[0.06] text-white/50',
  }

  return (
    <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#0f1117] px-4 py-2.5">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="text-xs font-semibold text-white" style={{ background: conversation.contactColor }}>
          {conversation.contactInitials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-[#e8f0e8]">{conversation.contactName}</span>
          {conversation.language === 'ar' ? (
            <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] text-purple-300">AR</span>
          ) : null}
          <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold', tierColors[conversation.leadTier])}>
            {conversation.leadTier}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-white/40">{conversation.contactPhone}</p>
      </div>

      <div className="hidden flex-col gap-1 lg:flex">
        <span className="text-[9px] uppercase tracking-wider text-white/30">Lead Score</span>
        <LeadScoreDot score={Math.max(1, Math.min(10, Math.round(conversation.leadScore / 10)))} />
      </div>

      <div className="flex-1" />

      <span className="hidden text-[10px] text-white/30 sm:block">{conversation.messageCount} msgs</span>

      <Button
        size="sm"
        variant="outline"
        className={cn(
          'h-7 gap-1.5 border text-[11px]',
          conversation.handledBy === 'ai'
            ? 'border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20'
            : 'border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20',
        )}
        onClick={onHandoffToggle}
      >
        {conversation.handledBy === 'ai' ? (
          <>
            <Bot className="h-3.5 w-3.5" />
            Aya AI
          </>
        ) : (
          <>
            <User className="h-3.5 w-3.5" />
            Human
          </>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 border-white/10 bg-white/[0.04] text-[11px] text-white/60 hover:bg-white/[0.08] hover:text-white"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {conversation.assignedAgentName ? conversation.assignedAgentName.split(' ')[0] : 'Assign'}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52 border-white/[0.08] bg-[#1a2235] text-white">
          {teamMembers.map((member) => (
            <DropdownMenuItem
              key={member.id}
              className="flex flex-col items-start py-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]"
              onClick={() => onAssign(member.id)}
            >
              <span className="font-medium">{member.name}</span>
              <span className="text-[10px] text-white/40">{member.role}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-white/30 hover:bg-yellow-400/10 hover:text-yellow-300"
        onClick={onStar}
      >
        <Star className={cn('h-3.5 w-3.5', conversation.isStarred && 'fill-yellow-300 text-yellow-300')} />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-white/30 hover:bg-white/[0.06] hover:text-white">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-44 border-white/[0.08] bg-[#1a2235] text-white">
          <DropdownMenuItem className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]">
            <Phone className="h-3.5 w-3.5 text-[#25D453]" />
            Call contact
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]">
            <ExternalLink className="h-3.5 w-3.5 text-blue-300" />
            View full profile
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]">
              <BellOff className="h-3.5 w-3.5 text-orange-300" />
              Mute nudges
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="border-white/[0.08] bg-[#1a2235] text-white">
              <DropdownMenuItem className="text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]">24 hours</DropdownMenuItem>
              <DropdownMenuItem className="text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]">7 days</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator className="bg-white/[0.06]" />
          <DropdownMenuItem className="gap-2 text-xs hover:bg-white/[0.06] focus:bg-white/[0.06]" onClick={onArchive}>
            <Archive className="h-3.5 w-3.5 text-white/50" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 text-xs text-red-300 hover:bg-red-500/10 focus:bg-red-500/10" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
