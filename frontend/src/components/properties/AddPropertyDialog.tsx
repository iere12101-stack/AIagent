'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Building2 } from 'lucide-react'

const propertySchema = z.object({
  refNumber: z.string().min(1, 'Reference number is required'),
  transactionType: z.enum(['SALE', 'RENT']),
  category: z.enum(['Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Studio']),
  bedrooms: z.enum(['Studio', '1', '2', '3', '4', '5+']),
  price: z.coerce.number().min(1, 'Price is required'),
  district: z.string().min(1, 'District is required'),
  building: z.string().min(1, 'Building is required'),
  status: z.enum(['Ready', 'Off Plan']),
  sizeSqft: z.coerce.number().min(1, 'Size is required'),
  agentName: z.string().min(1, 'Agent name is required'),
  agentWhatsApp: z.string().min(1, 'Agent WhatsApp is required'),
  partnerAgency: z.string().optional(),
  coBrokerCommission: z.string().optional(),
  partnerAgentName: z.string().optional(),
  partnerAgentPhone: z.string().optional(),
  listingUrl: z.string().optional(),
})

type PropertyFormValues = z.infer<typeof propertySchema>

interface AddPropertyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source?: 'direct' | 'indirect'
}

export function AddPropertyDialog({ open, onOpenChange, source = 'direct' }: AddPropertyDialogProps) {
  const queryClient = useQueryClient()

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertySchema) as Resolver<PropertyFormValues>,
    defaultValues: {
      refNumber: '',
      transactionType: 'SALE',
      category: 'Apartment',
      bedrooms: '2',
      price: 0,
      district: '',
      building: '',
      status: 'Ready',
      sizeSqft: 0,
      agentName: '',
      agentWhatsApp: '',
      partnerAgency: '',
      coBrokerCommission: '',
      partnerAgentName: '',
      partnerAgentPhone: '',
      listingUrl: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (values: PropertyFormValues) =>
      fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refNumber: values.refNumber.toUpperCase(),
          transactionType: values.transactionType,
          category: values.category,
          bedrooms: values.bedrooms,
          bathrooms: null,
          sizeSqft: values.sizeSqft,
          status: values.status,
          district: values.district,
          building: values.building,
          fullArea: values.district,
          priceAed: values.price,
          agentName: values.agentName,
          agentWhatsapp: values.agentWhatsApp,
          available: true,
          portal: 'IERE Website',
          source,
          partnerAgency: source === 'indirect' ? values.partnerAgency : undefined,
          coBrokerCommission: source === 'indirect' ? values.coBrokerCommission : undefined,
          partnerAgentName: source === 'indirect' ? values.partnerAgentName : undefined,
          partnerAgentPhone: source === 'indirect' ? values.partnerAgentPhone : undefined,
          listingUrl: source === 'indirect' ? values.listingUrl : undefined,
        }),
      }).then(async (response) => {
        const payload = await response.json().catch(() => ({})) as {
          error?: string
          code?: string
          details?: unknown
        }

        if (!response.ok) {
          if (payload.code === 'DUPLICATE_REF') {
            throw new Error('Reference number already exists. Please use a unique ref number.')
          }
          throw new Error(payload.error ?? 'Failed to create property')
        }

        return payload
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['property-source-stats'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-gaps'] })
      toast.success('Property created successfully!', {
        description: `${form.getValues('refNumber').toUpperCase()} has been added to your listings.`,
      })
      form.reset()
      onOpenChange(false)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create property'
      toast.error('Failed to create property', {
        description: message,
      })
    },
  })

  const onSubmit = (values: PropertyFormValues) => {
    mutation.mutate(values)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950 p-2">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            Add New Property
          </DialogTitle>
          <DialogDescription>Add a new property listing to your portfolio. All fields are required.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Row 1: Ref Number + Transaction Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="refNumber">Reference Number</Label>
              <Input
                id="refNumber"
                placeholder="IERE-24XXX"
                className="font-mono"
                {...form.register('refNumber')}
              />
              {form.formState.errors.refNumber && (
                <p className="text-xs text-destructive">{form.formState.errors.refNumber.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="transactionType">Transaction Type</Label>
              <Select
                // eslint-disable-next-line react-hooks/incompatible-library
                value={form.watch('transactionType')}
                onValueChange={(v) => form.setValue('transactionType', v as 'SALE' | 'RENT')}
              >
                <SelectTrigger id="transactionType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALE">For Sale</SelectItem>
                  <SelectItem value="RENT">For Rent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Category + Bedrooms */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={form.watch('category')}
                onValueChange={(v) => form.setValue('category', v as PropertyFormValues['category'])}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Apartment">Apartment</SelectItem>
                  <SelectItem value="Villa">Villa</SelectItem>
                  <SelectItem value="Townhouse">Townhouse</SelectItem>
                  <SelectItem value="Penthouse">Penthouse</SelectItem>
                  <SelectItem value="Studio">Studio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Select
                value={form.watch('bedrooms')}
                onValueChange={(v) => form.setValue('bedrooms', v as PropertyFormValues['bedrooms'])}
              >
                <SelectTrigger id="bedrooms">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Studio">Studio</SelectItem>
                  <SelectItem value="1">1 Bedroom</SelectItem>
                  <SelectItem value="2">2 Bedrooms</SelectItem>
                  <SelectItem value="3">3 Bedrooms</SelectItem>
                  <SelectItem value="4">4 Bedrooms</SelectItem>
                  <SelectItem value="5+">5+ Bedrooms</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Price + Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (AED)</Label>
              <Input
                id="price"
                type="number"
                placeholder="1,500,000"
                {...form.register('price')}
              />
              {form.formState.errors.price && (
                <p className="text-xs text-destructive">{form.formState.errors.price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sizeSqft">Size (sqft)</Label>
              <Input
                id="sizeSqft"
                type="number"
                placeholder="1,200"
                {...form.register('sizeSqft')}
              />
              {form.formState.errors.sizeSqft && (
                <p className="text-xs text-destructive">{form.formState.errors.sizeSqft.message}</p>
              )}
            </div>
          </div>

          {/* Row 4: District + Building */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                placeholder="Dubai Marina"
                {...form.register('district')}
              />
              {form.formState.errors.district && (
                <p className="text-xs text-destructive">{form.formState.errors.district.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="building">Building</Label>
              <Input
                id="building"
                placeholder="Marina Heights"
                {...form.register('building')}
              />
              {form.formState.errors.building && (
                <p className="text-xs text-destructive">{form.formState.errors.building.message}</p>
              )}
            </div>
          </div>

          {/* Row 5: Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(v) => form.setValue('status', v as 'Ready' | 'Off Plan')}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ready">Ready</SelectItem>
                <SelectItem value="Off Plan">Off Plan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agent Section */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Agent Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="agentName">Agent Name</Label>
                <Input
                  id="agentName"
                  placeholder="Ahmed Hassan"
                  {...form.register('agentName')}
                />
                {form.formState.errors.agentName && (
                  <p className="text-xs text-destructive">{form.formState.errors.agentName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="agentWhatsApp">Agent WhatsApp</Label>
                <Input
                  id="agentWhatsApp"
                  placeholder="+971501234567"
                  {...form.register('agentWhatsApp')}
                />
                {form.formState.errors.agentWhatsApp && (
                  <p className="text-xs text-destructive">{form.formState.errors.agentWhatsApp.message}</p>
                )}
              </div>
            </div>
          </div>

          {source === 'indirect' && (
            <>
              <div className="space-y-3 border-t pt-4 mt-4">
                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  Partner Agency Details
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="partnerAgency">Partner Agency</Label>
                    <Input id="partnerAgency" placeholder="e.g. Betterhomes, Emaar" {...form.register('partnerAgency')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="coBrokerCommission">Co-broker Commission</Label>
                    <Input id="coBrokerCommission" placeholder="e.g. 2%, AED 50,000" {...form.register('coBrokerCommission')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partnerAgentName">Partner Agent Name</Label>
                    <Input id="partnerAgentName" placeholder="Agent full name" {...form.register('partnerAgentName')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partnerAgentPhone">Partner Agent Phone/WhatsApp</Label>
                    <Input id="partnerAgentPhone" placeholder="+971..." {...form.register('partnerAgentPhone')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="listingUrl">Original Listing URL (optional)</Label>
                  <Input id="listingUrl" placeholder="https://propertyfinder.ae/..." {...form.register('listingUrl')} />
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { form.reset(); onOpenChange(false) }}>
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Creating...
                </>
              ) : (
                'Create Property'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
