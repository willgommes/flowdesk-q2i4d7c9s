import { AppHeader } from '@/components/AppHeader'
import { Calendar as CalendarIcon } from 'lucide-react'

export default function CalendarPage() {
  return (
    <div className="flex flex-col h-full min-h-screen">
      <AppHeader />
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
          <CalendarIcon className="w-8 h-8 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-display font-semibold mb-2">Calendário</h1>
        <p className="text-muted-foreground max-w-md">
          A visualização de calendário está em desenvolvimento. Em breve você poderá acompanhar os
          prazos de todos os seus cartões aqui.
        </p>
      </div>
    </div>
  )
}
