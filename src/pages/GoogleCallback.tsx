import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import { sendGoogleTokenCode } from '@/services/integrations'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [status, setStatus] = useState('Processando autenticação do Google...')

  useEffect(() => {
    const code = searchParams.get('code')
    if (!code) {
      toast({ title: 'Código de autorização não encontrado', variant: 'destructive' })
      navigate('/integracoes')
      return
    }

    const redirectUri = window.location.origin + window.location.pathname

    sendGoogleTokenCode(code, redirectUri)
      .then(() => {
        toast({ title: 'Google Agenda conectado com sucesso!' })
        navigate('/integracoes')
      })
      .catch((err) => {
        toast({
          title: 'Erro ao conectar Google',
          description: getErrorMessage(err),
          variant: 'destructive',
        })
        navigate('/integracoes')
      })
  }, [searchParams, navigate, toast])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/10">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-6"></div>
      <p className="text-xl font-medium text-foreground">{status}</p>
      <p className="text-sm text-muted-foreground mt-2">
        Por favor, aguarde enquanto finalizamos a configuração.
      </p>
    </div>
  )
}
