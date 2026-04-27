'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, CalendarPlus } from 'lucide-react'

const bookingSchema = z.object({
  contactName: z.string().min(1, 'Contact name is required'),
  agentName: z.string().min(1, 'Agent name is required'),
  agentWhatsapp: z.string().min(7, 'Agent WhatsApp is required'),
  propertyRef: z.string().optional(),
  propertyArea: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  duration: z.enum(['30', '60', '120']),
  notes: z.string().optional(),
})

type BookingFormValues = z.infer<typeof bookingSchema>

interface CreateBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateBookingDialog({ open, onOpenChange }: CreateBookingDialogProps) {
  const queryClient = useQueryClient()

  // Default date to today
  const today = new Date().toISOString().split('T')[0]

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      contactName: '',
      agentName: '',
      agentWhatsapp: '',
      propertyRef: '',
      propertyArea: '',
      date: today,
      time: '10:00',
      duration: '60',
      notes: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: BookingFormValues) =>
      fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: values.contactName,
          agentName: values.agentName,
          agentWhatsapp: values.agentWhatsapp,
          propertyRef: values.propertyRef || null,
          propertyArea: values.propertyArea || null,
          scheduledDate: values.date,
          scheduledTime: values.time,
          duration: parseInt(values.duration, 10),
          notes: values.notes || null,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error('Failed to create booking')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast.success('Booking created successfully!', {
        description: `Viewing has been scheduled for ${form.getValues('date')}.`,
      })
      form.reset({ date: today, time: '10:00', duration: '60' })
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Failed to create booking', {
        description: 'Please check your inputs and try again.',
      })
    },
  })

  const onSubmit = (values: BookingFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset({ date: today, time: '10:00', duration: '60' }); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
              <CalendarPlus className="h-5 w-5 text-emerald-600" />
            </div>
            Create New Booking
          </DialogTitle>
          <DialogDescription>Schedule a property viewing with a lead.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Contact + Agent */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactName">Contact *</Label>
              <Input
                id="contactName"
                placeholder="Fatima Al Maktoum"
                {...form.register('contactName')}
              />
              {form.formState.errors.contactName && (
                <p className="text-xs text-destructive">{form.formState.errors.contactName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="agentName">Agent Name *</Label>
              <Input
                id="agentName"
                placeholder="Ahmed Hassan"
                {...form.register('agentName')}
              />
              {form.formState.errors.agentName && (
                <p className="text-xs text-destructive">{form.formState.errors.agentName.message}</p>
              )}
            </div>
          </div>

          {/* Agent WhatsApp */}
          <div className="space-y-2">
            <Label htmlFor="agentWhatsapp">Agent WhatsApp *</Label>
            <Input
              id="agentWhatsapp"
              placeholder="+971501234567"
              {...form.register('agentWhatsapp')}
            />
            {form.formState.errors.agentWhatsapp && (
              <p className="text-xs text-destructive">{form.formState.errors.agentWhatsapp.message}</p>
            )}
          </div>

          {/* Property Ref + Area */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyRef">Property Ref</Label>
              <Input
                id="propertyRef"
                placeholder="IERE-24001"
                className="font-mono"
                {...form.register('propertyRef')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="propertyArea">Property Area</Label>
              <Input
                id="propertyArea"
                placeholder="Dubai Marina"
                {...form.register('propertyArea')}
              />
            </div>
          </div>

          {/* Date + Time + Duration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                {...form.register('date')}
              />
              {form.formState.errors.date && (
                <p className="text-xs text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                {...form.register('time')}
              />
              {form.formState.errors.time && (
                <p className="text-xs text-destructive">{form.formState.errors.time.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                // eslint-disable-next-line react-hooks/incompatible-library
                value={form.watch('duration')}
                onValueChange={(v) => form.setValue('duration', v as BookingFormValues['duration'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any special instructions or notes..."
              className="min-h-[80px] resize-none"
              {...form.register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { form.reset({ date: today, time: '10:00', duration: '60' }); onOpenChange(false) }}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                'Create Booking'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
