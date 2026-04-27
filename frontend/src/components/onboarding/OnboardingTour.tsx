'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, MessageSquare, Kanban, Search, Command, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TourStep {
  title: string
  description: string
  icon: React.ElementType
  highlight?: string
}

const tourSteps: TourStep[] = [
  {
    title: 'Welcome to IERE Bot',
    description:
      'Your AI-powered WhatsApp chatbot platform for real estate. Manage conversations, track leads, and close deals — all from one dashboard.',
    icon: Building2,
  },
  {
    title: 'AI-Powered Inbox',
    description:
      'Handle WhatsApp conversations with smart AI assistance. Messages are automatically categorized, lead-scored, and routed to the right agent.',
    icon: MessageSquare,
    highlight: 'inbox',
  },
  {
    title: 'Lead Pipeline',
    description:
      'Track every lead through your sales pipeline. Visualize stages from cold to converted, with automatic lead scoring and follow-up nudges.',
    icon: Kanban,
    highlight: 'pipeline',
  },
  {
    title: 'Property Management',
    description:
      'Browse and manage 204+ property listings. Each property is AI-matched to incoming enquiries for instant, accurate recommendations.',
    icon: Building2,
    highlight: 'properties',
  },
  {
    title: 'Quick Search',
    description:
      'Access anything instantly with Cmd+K (or Ctrl+K). Search pages, contacts, properties, and actions — your command center for speed.',
    icon: Command,
    highlight: 'search',
  },
]

// Confetti particle component
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

export function OnboardingTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [isTourCompleted, setIsTourCompleted] = useState(false)

  useEffect(() => {
    if (!isTourCompleted) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsOpen(true), 800)
      return () => clearTimeout(timer)
    }
  }, [isTourCompleted])

  const completeTour = useCallback(() => {
    setIsTourCompleted(true)
    setShowConfetti(true)
    setIsComplete(true)
    setTimeout(() => {
      setIsOpen(false)
      setShowConfetti(false)
      setIsComplete(false)
      setCurrentStep(0)
    }, 2000)
  }, [])

  const skipTour = useCallback(() => {
    completeTour()
  }, [completeTour])

  const nextStep = useCallback(() => {
    if (currentStep >= tourSteps.length - 1) {
      completeTour()
      return
    }
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1)
      setIsAnimating(false)
    }, 200)
  }, [currentStep, completeTour])

  const prevStep = useCallback(() => {
    if (currentStep <= 0) return
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentStep((prev) => prev - 1)
      setIsAnimating(false)
    }, 200)
  }, [currentStep])

  // Restart function - exposed via custom event
  useEffect(() => {
    const handler = () => {
      setIsTourCompleted(false)
      setCurrentStep(0)
      setIsComplete(false)
      setShowConfetti(false)
      setIsOpen(true)
    }
    window.addEventListener('restart-tour', handler)
    return () => window.removeEventListener('restart-tour', handler)
  }, [])

  if (!isOpen) return null

  const step = tourSteps[currentStep]
  const StepIcon = step.icon
  const progress = ((currentStep + 1) / tourSteps.length) * 100

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        onClick={skipTour}
      />

      {/* Confetti container */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[101]">
          {Array.from({ length: 40 }).map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </div>
      )}

      {/* Tour Card */}
      <div
        className={`relative z-[102] w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden transition-all duration-300 ${
          isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* Emerald gradient header */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 px-6 py-8 text-white">
          {/* Close button */}
          <button
            onClick={skipTour}
            className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Icon */}
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-2xl bg-white/20 backdrop-blur-sm p-4">
              <StepIcon className="h-8 w-8" />
            </div>
          </div>

          {/* Step number badge */}
          <div className="text-center">
            <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 text-xs mb-2">
              Step {currentStep + 1} of {tourSteps.length}
            </Badge>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-center mt-2">{step.title}</h2>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-sm text-muted-foreground leading-relaxed text-center">
            {step.description}
          </p>

          {/* Step indicator dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {tourSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i !== currentStep) {
                    setIsAnimating(true)
                    setTimeout(() => {
                      setCurrentStep(i)
                      setIsAnimating(false)
                    }, 200)
                  }
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? 'w-6 h-2 bg-emerald-500'
                    : i < currentStep
                    ? 'w-2 h-2 bg-emerald-300 dark:bg-emerald-700'
                    : 'w-2 h-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={prevStep}
            disabled={currentStep === 0 || isComplete}
            className="text-muted-foreground hover:text-foreground"
          >
            Back
          </Button>

          <div className="flex items-center gap-2">
            {!isComplete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={skipTour}
                className="text-muted-foreground hover:text-foreground"
              >
                Skip
              </Button>
            )}

            {isComplete ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">All done!</span>
              </div>
            ) : (
              <Button
                onClick={nextStep}
                disabled={isAnimating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {currentStep === tourSteps.length - 1 ? (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Get Started
                  </>
                ) : (
                  'Next'
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Inline keyframes for confetti */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confetti-fall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  )
}
