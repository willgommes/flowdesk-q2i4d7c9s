import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { getErrorMessage } from '@/lib/pocketbase/errors'

const recoverSchema = z.object({
  email: z.string().email('Email inválido'),
})

export default function RecoverPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const { toast } = useToast()
  const { recoverPassword } = useAuth()

  const form = useForm<z.infer<typeof recoverSchema>>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: z.infer<typeof recoverSchema>) {
    setIsLoading(true)
    try {
      const { success, error } = await recoverPassword(values.email)
      if (success) {
        setSent(true)
        toast({
          title: 'Email enviado',
          description: `Enviamos as instruções para ${values.email}`,
        })
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: getErrorMessage(error) })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/50 shadow-elevation">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Recuperar senha</CardTitle>
        <CardDescription className="text-center">
          Informe seu email para receber um link de recuperação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!sent ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="nome@agencia.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full mt-2" disabled={isLoading}>
                {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground bg-green-50 text-green-800 rounded-md border border-green-200">
            Verifique sua caixa de entrada.
          </div>
        )}
        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Voltar para o login
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
