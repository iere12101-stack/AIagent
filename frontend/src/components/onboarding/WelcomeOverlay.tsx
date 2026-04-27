'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  MessageSquare,
  Users,
  LayoutDashboard,
  Inbox,
  BarChart3,
  Bot,
  Sparkles,
  Brain,
  Target,
  Bell,
  CheckCircle2,
  Command,
  ChevronRight,
  X,
  ArrowRight,
  Home,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import type { AppPage } from '@/lib/store'

const TOTAL_STEPS = 4

// ─── Confetti ──────────────────────────────────────────────────────────────
function ConfettiParticle({ index }: { index: number }) {
  const colors = ['#10b981', '#34d399', '#6ee7b7', '#059669', '#fbbf24', '#f59e0b', '#3b82f6', '#8b5cf6']
  const size = 6 + (index % 4) * 2
  const left = Math.random() * 100
  const delay = Math.random() * 0.5
  const duration = 1.5 + Math.random() * 1
  const rotation = Math.random() * 360
  const color = colors[index % colors.length]

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${left}%`,
        top: '-10px',
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        borderRadius: index % 3 === 0 ? '50%' : index % 3 === 1 ? '2px' : '0',
        animation: `confetti-fall ${duration}s ease-out ${delay}s forwards`,
        transform: `rotate(${rotation}deg)`,
        opacity: 0,
      }}
    />
  )
}

// ─── Step 1: Welcome ───────────────────────────────────────────────────────
function StepWelcome() {
  const features = [
    { icon: MessageSquare, title: 'Smart Conversations', desc: 'AI handles WhatsApp chats automatically' },
    { icon: Users, title: 'Lead Management', desc: 'Track & score every lead from first contact' },
    { icon: Building2, title: 'Property Listings', desc: '204+ Dubai properties AI-matched to buyers' },
  ]

  return (
    <div className="flex flex-col items-center text-center px-2">
      {/* Animated glowing Building2 icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-xl animate-pulse" />
        <div className="absolute inset-[-8px] rounded-full bg-emerald-500/15 blur-2xl animate-[pulse_2.5s_ease-in-out_infinite]" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <Building2 className="w-10 h-10 text-white" />
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
        Welcome to <span className="text-emerald-600 dark:text-emerald-400">IERE Bot</span>
      </h1>
      <p className="text-muted-foreground text-sm md:text-base max-w-sm mb-8">
        Your AI-powered WhatsApp real estate assistant dashboard
      </p>

      {/* Feature highlights */}
      <div className="w-full max-w-md space-y-3 stagger-children">
        {features.map((feat) => {
          const Icon = feat.icon
          return (
            <div
              key={feat.title}
              className="flex items-center gap-4 p-3 rounded-xl bg-muted/50 dark:bg-muted/20 border border-border/50 hover:border-emerald-500/30 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-foreground">{feat.title}</p>
                <p className="text-xs text-muted-foreground">{feat.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 2: Navigate ──────────────────────────────────────────────────────
function StepNavigate() {
  const pages = [
    { icon: LayoutDashboard, title: 'Dashboard', desc: 'Overview of conversations, leads, and activity', color: 'emerald' },
    { icon: Inbox, title: 'Inbox', desc: 'WhatsApp conversations with AI assistance', color: 'blue' },
    { icon: Building2, title: 'Properties', desc: 'Browse and manage 204+ Dubai listings', color: 'amber' },
    { icon: BarChart3, title: 'Analytics', desc: 'Insights on performance and conversion rates', color: 'purple' },
  ]

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-400',
  }

  return (
    <div className="flex flex-col items-center text-center px-2">
      {/* Sidebar illustration */}
      <div className="relative mb-6">
        <div className="w-72 md:w-80 rounded-2xl bg-gray-900 dark:bg-gray-950 border border-gray-800 dark:border-gray-800 p-4 shadow-2xl">
          {/* Mock sidebar header */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">IERE Bot</p>
              <p className="text-[10px] text-gray-400">Real Estate</p>
            </div>
          </div>

          {/* Mock nav items */}
          <div className="space-y-1">
            {pages.map((page, i) => {
              const Icon = page.icon
              return (
                <div
                  key={page.title}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs ${
                    i === 0
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'text-gray-400 hover:text-gray-300'
                  } transition-colors`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="font-medium">{page.title}</span>
                  {i === 0 && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Mock search bar */}
          <div className="mt-4 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-800 text-gray-500 text-[10px]">
            <Search className="w-3 h-3" />
            <span>Search...</span>
            <kbd className="ml-auto px-1.5 py-0.5 rounded bg-gray-700 text-[9px] font-mono text-gray-400">⌘K</kbd>
          </div>
        </div>
        {/* Decorative glow behind illustration */}
        <div className="absolute -inset-4 -z-10 rounded-3xl bg-emerald-500/10 blur-2xl" />
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Quick Navigation</h2>
      <p className="text-muted-foreground text-sm mb-6">Everything you need, just a click away</p>

      {/* Key pages grid */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 stagger-children">
        {pages.map((page) => {
          const Icon = page.icon
          return (
            <div
              key={page.title}
              className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 dark:bg-muted/20 border border-border/50 hover:border-emerald-500/30 transition-colors text-left"
            >
              <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[page.color]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground">{page.title}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{page.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Keyboard shortcut tip */}
      <div className="mt-6 flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
        <Command className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
          Use <kbd className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 font-mono text-[11px]">⌘K</kbd> to search anything
        </p>
      </div>
    </div>
  )
}

// ─── Step 3: AI Features ───────────────────────────────────────────────────
function StepAIFeatures() {
  const features = [
    {
      icon: MessageSquare,
      title: 'Smart Replies',
      desc: 'AI handles common queries automatically',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    },
    {
      icon: Target,
      title: 'Lead Scoring',
      desc: 'Automatic lead qualification (0-100)',
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-50 dark:bg-amber-500/10',
    },
    {
      icon: Brain,
      title: 'Property Matching',
      desc: 'AI matches buyers with listings',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    },
    {
      icon: Bell,
      title: 'Nudge Engine',
      desc: 'Automated follow-up sequences',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10',
    },
  ]

  return (
    <div className="flex flex-col items-center text-center px-2">
      {/* Bot icon with sparkle animation */}
      <div className="relative mb-6">
        <div className="absolute -inset-3 rounded-full bg-emerald-400/20 blur-xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <Bot className="w-10 h-10 text-white" />
        </div>
        {/* Sparkles around the icon */}
        <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 animate-bounce" />
        <Sparkles className="absolute -bottom-1 -left-3 w-4 h-4 text-emerald-300 animate-bounce [animation-delay:0.3s]" />
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
        AI-Powered <span className="text-emerald-600 dark:text-emerald-400">Features</span>
      </h2>
      <p className="text-muted-foreground text-sm mb-8 max-w-sm">
        Intelligent automation that works while you sleep
      </p>

      {/* 2x2 Feature cards */}
      <div className="w-full max-w-md grid grid-cols-2 gap-3 stagger-children">
        {features.map((feat) => {
          const Icon = feat.icon
          return (
            <div
              key={feat.title}
              className={`relative group p-4 rounded-xl ${feat.bgColor} border border-border/50 hover:border-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md text-left overflow-hidden`}
            >
              {/* Gradient accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feat.color} opacity-60 group-hover:opacity-100 transition-opacity`} />

              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-white/80 to-white/50 dark:from-white/10 dark:to-white/5 flex items-center justify-center mb-3 shadow-sm border border-white/50 dark:border-white/10">
                <Icon className="w-4.5 h-4.5 text-foreground" />
              </div>
              <p className="font-semibold text-sm text-foreground mb-1">{feat.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 4: Get Started ───────────────────────────────────────────────────
function StepGetStarted({ onNavigate }: { onNavigate: (page: AppPage) => void }) {
  const quickActions = [
    { icon: LayoutDashboard, label: 'Go to Dashboard', page: 'dashboard' as AppPage, color: 'emerald' },
    { icon: Inbox, label: 'View Inbox', page: 'inbox' as AppPage, color: 'blue' },
    { icon: Building2, label: 'Browse Properties', page: 'properties' as AppPage, color: 'amber' },
  ]

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/25',
    blue: 'bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/25',
    amber: 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/25',
  }

  return (
    <div className="flex flex-col items-center text-center px-2">
      {/* Large checkmark circle */}
      <div className="relative mb-6">
        <div className="absolute -inset-4 rounded-full bg-emerald-400/20 blur-xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
        You&apos;re All <span className="text-emerald-600 dark:text-emerald-400">Set!</span>
      </h2>
      <p className="text-muted-foreground text-sm mb-8 max-w-sm">
        Start managing your WhatsApp conversations and leads
      </p>

      {/* Quick action buttons */}
      <div className="w-full max-w-sm space-y-3 stagger-children">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => onNavigate(action.page)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-emerald-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group`}
            >
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${colorMap[action.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-sm text-foreground flex-1 text-left">{action.label}</span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main WelcomeOverlay ───────────────────────────────────────────────────
export function WelcomeOverlay() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [isCompleted, setIsCompleted] = useState(false)
  const setCurrentPage = useAppStore((s) => s.setCurrentPage)

  // Show overlay if not completed
  useEffect(() => {
    if (!isCompleted) {
      const timer = setTimeout(() => setIsVisible(true), 600)
      return () => clearTimeout(timer)
    }
  }, [isCompleted])

  const completeOnboarding = useCallback(() => {
    setIsCompleted(true)
    setShowConfetti(true)
    setTimeout(() => {
      setIsVisible(false)
      setShowConfetti(false)
    }, 2200)
  }, [])

  const skipOnboarding = useCallback(() => {
    completeOnboarding()
  }, [completeOnboarding])

  const goNext = useCallback(() => {
    if (currentStep >= TOTAL_STEPS - 1) {
      completeOnboarding()
      return
    }
    setDirection('forward')
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep((s) => s + 1)
      setIsAnimating(false)
    }, 250)
  }, [currentStep, completeOnboarding])

  const goBack = useCallback(() => {
    if (currentStep <= 0) return
    setDirection('backward')
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep((s) => s - 1)
      setIsAnimating(false)
    }, 250)
  }, [currentStep])

  const goToStep = useCallback(
    (step: number) => {
      if (step === currentStep) return
      setDirection(step > currentStep ? 'forward' : 'backward')
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentStep(step)
        setIsAnimating(false)
      }, 250)
    },
    [currentStep]
  )

  const handleNavigate = useCallback(
    (page: AppPage) => {
      setCurrentPage(page)
      completeOnboarding()
    },
    [setCurrentPage, completeOnboarding]
  )

  // Restart support via custom event
  useEffect(() => {
    const handler = () => {
      setIsCompleted(false)
      setCurrentStep(0)
      setDirection('forward')
      setShowConfetti(false)
      setIsVisible(true)
    }
    window.addEventListener('restart-welcome', handler)
    return () => window.removeEventListener('restart-welcome', handler)
  }, [])

  if (!isVisible) return null

  const slideClass = isAnimating
    ? direction === 'forward'
      ? 'animate-[overlayExitForward_250ms_ease-in_forwards]'
      : 'animate-[overlayExitBackward_250ms_ease-in_forwards]'
    : 'animate-[overlayEnter_350ms_ease-out]'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_300ms_ease-out]"
        onClick={skipOnboarding}
      />

      {/* Confetti */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[101]">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Card */}
      <div
        className={`relative z-[102] w-full max-w-lg mx-4 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden ${slideClass}`}
      >
        {/* Skip button */}
        <button
          onClick={skipOnboarding}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors backdrop-blur-sm"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Step progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
            style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Step badge */}
        <div className="flex justify-center pt-4 pb-0">
          <Badge
            variant="outline"
            className="text-[11px] font-medium px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20"
          >
            Step {currentStep + 1} of {TOTAL_STEPS}
          </Badge>
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-6">
          {currentStep === 0 && <StepWelcome />}
          {currentStep === 1 && <StepNavigate />}
          {currentStep === 2 && <StepAIFeatures />}
          {currentStep === 3 && <StepGetStarted onNavigate={handleNavigate} />}
        </div>

        {/* Step indicator dots */}
        <div className="flex items-center justify-center gap-2 pb-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`rounded-full transition-all duration-300 focus-ring ${
                i === currentStep
                  ? 'w-6 h-2 bg-emerald-500'
                  : i < currentStep
                    ? 'w-2 h-2 bg-emerald-300 dark:bg-emerald-700 hover:bg-emerald-400'
                    : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            disabled={currentStep === 0 || isAnimating}
            className="text-muted-foreground hover:text-foreground"
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < TOTAL_STEPS - 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={skipOnboarding}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip
              </Button>
            )}

            <Button
              onClick={goNext}
              disabled={isAnimating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm shadow-emerald-600/20"
            >
              {currentStep === TOTAL_STEPS - 1 ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Inline keyframes for overlay animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes overlayEnter {
              from { opacity: 0; transform: translateY(16px) scale(0.97); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes overlayExitForward {
              from { opacity: 1; transform: translateX(0); }
              to { opacity: 0; transform: translateX(-24px); }
            }
            @keyframes overlayExitBackward {
              from { opacity: 1; transform: translateX(0); }
              to { opacity: 0; transform: translateX(24px); }
            }
            @keyframes confetti-fall {
              0% { opacity: 1; transform: translateY(0) rotate(0deg); }
              100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
            }
          `,
        }}
      />
    </div>
  )
}
