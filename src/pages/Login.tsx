import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
})

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setIsLoading(true)
    try {
      const success = await login(values.email, values.password)
      if (success) {
        toast({ title: 'Bem-vindo de volta!', description: 'Login realizado com sucesso.' })
        navigate('/')
      } else {
        toast({
          variant: 'destructive',
          title: 'Erro de autenticação',
          description: 'Email ou senha incorretos.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/50 shadow-elevation">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Entrar</CardTitle>
        <CardDescription className="text-center">
          Digite seu email e senha para acessar a plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Senha</FormLabel>
                    <Link
                      to="/recuperar-senha"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Ou continue com</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => toast({ description: 'Integração Google em breve.' })}
            >
              Entrar com Google
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center text-sm">
          Não tem uma conta?{' '}
          <Link to="/signup" className="text-primary font-semibold hover:underline">
            Cadastrar
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
