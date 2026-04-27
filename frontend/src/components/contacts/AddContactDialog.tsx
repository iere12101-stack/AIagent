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
import { Loader2, UserPlus } from 'lucide-react'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(7, 'Phone number is required'),
  email: z.string().email('Invalid email').or(z.literal('')),
  leadStatus: z.enum(['new', 'cold', 'warm', 'hot']),
  intent: z.enum(['buy', 'rent', 'invest', 'browse']),
  language: z.enum(['en', 'ar']),
  notes: z.string().optional(),
})

type ContactFormValues = z.infer<typeof contactSchema>

interface AddContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddContactDialog({ open, onOpenChange }: AddContactDialogProps) {
  const queryClient = useQueryClient()
  const [phoneInput, setPhoneInput] = useState('')

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      leadStatus: 'new',
      intent: 'buy',
      language: 'en',
      notes: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: ContactFormValues) =>
      fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          phone: `+971${values.phone.replace(/\D/g, '')}`,
          email: values.email || null,
          leadStatus: values.leadStatus,
          intent: values.intent,
          language: values.language,
          notes: values.notes || null,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error('Failed to create contact')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['analytics-summary'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      toast.success('Contact created successfully!', {
        description: `${form.getValues('name')} has been added to your leads.`,
      })
      form.reset()
      setPhoneInput('')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('Failed to create contact', {
        description: 'Please check your inputs and try again.',
      })
    },
  })

  const onSubmit = (values: ContactFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { form.reset(); setPhoneInput('') }; onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
              <UserPlus className="h-5 w-5 text-emerald-600" />
            </div>
            Add New Contact
          </DialogTitle>
          <DialogDescription>Add a new lead to your contact database.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Ahmed Hassan"
                {...form.register('name')}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  +971
                </span>
                <Input
                  id="phone"
                  placeholder="50 123 4567"
                  className="pl-14"
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value)
                    form.setValue('phone', e.target.value)
                  }}
                />
              </div>
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="ahmed@example.com"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          {/* Lead Status + Intent */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lead Status</Label>
              <Select
                // eslint-disable-next-line react-hooks/incompatible-library
                value={form.watch('leadStatus')}
                onValueChange={(v) => form.setValue('leadStatus', v as ContactFormValues['leadStatus'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="cold">Cold</SelectItem>
                  <SelectItem value="warm">Warm</SelectItem>
                  <SelectItem value="hot">Hot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Intent</Label>
              <Select
                value={form.watch('intent')}
                onValueChange={(v) => form.setValue('intent', v as ContactFormValues['intent'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="invest">Invest</SelectItem>
                  <SelectItem value="browse">Browse</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={form.watch('language')}
              onValueChange={(v) => form.setValue('language', v as 'en' | 'ar')}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about this contact..."
              className="min-h-[80px] resize-none"
              {...form.register('notes')}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { form.reset(); setPhoneInput(''); onOpenChange(false) }}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                'Add Contact'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
