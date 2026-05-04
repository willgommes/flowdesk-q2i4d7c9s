import { useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ClockIcon } from 'lucide-react'
import { addDays, isPast, isBefore, parseISO, differenceInDays, startOfDay } from 'date-fns'
import pb from '@/lib/pocketbase/client'

export function ExpiringContractsAlert() {
  const [expiringClients, setExpiringClients] = useState<any[]>([])

  useEffect(() => {
    const loadExpiring = async () => {
      try {
        const clients = await pb.collection('clients').getFullList({
          filter: "contract_expiration_date != '' && contract_status != 'expired'",
        })

        const now = startOfDay(new Date())
        const thirtyDaysFromNow = addDays(now, 30)

        const expiring = clients.filter((c) => {
          if (!c.contract_expiration_date) return false
          const expDate = parseISO(c.contract_expiration_date)
          return isBefore(expDate, thirtyDaysFromNow) && !isPast(expDate)
        })

        setExpiringClients(expiring)
      } catch (err) {
        console.error('Failed to load expiring contracts', err)
      }
    }

    loadExpiring()
  }, [])

  if (expiringClients.length === 0) return null

  return (
    <Alert
      variant="default"
      className="mb-6 border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
    >
      <ClockIcon className="h-5 w-5" />
      <AlertTitle className="text-base font-semibold">Contratos Próximos do Vencimento</AlertTitle>
      <AlertDescription>
        Você tem {expiringClients.length} contrato{expiringClients.length > 1 ? 's' : ''} expirando
        nos próximos 30 dias:
        <ul className="mt-2 list-disc list-inside pl-2 text-sm space-y-1">
          {expiringClients.map((c) => {
            const expDate = parseISO(c.contract_expiration_date)
            const daysLeft = differenceInDays(expDate, new Date())
            return (
              <li key={c.id}>
                <span className="font-medium">{c.name}</span>{' '}
                <span className="opacity-80 text-xs">
                  (Expira em {daysLeft} dia{daysLeft !== 1 ? 's' : ''})
                </span>
              </li>
            )
          })}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
