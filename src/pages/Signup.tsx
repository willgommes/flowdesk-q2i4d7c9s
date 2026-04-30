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
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'

const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, 'O nome é obrigatório')
      .min(2, 'O nome deve ter pelo menos 2 caracteres'),
    email: z.string().min(1, 'O e-mail é obrigatório').email('Formato de e-mail inválido'),
    password: z
      .string()
      .min(1, 'A senha é obrigatória')
      .min(8, 'A senha deve ter no mínimo 8 caracteres'),
    passwordConfirm: z.string().min(1, 'A confirmação de senha é obrigatória'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'As senhas não coincidem',
    path: ['passwordConfirm'],
  })

export default function Signup() {
  const [isLoading, setIsLoading] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', passwordConfirm: '' },
  })

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setIsLoading(true)
    try {
      const { success, error } = await register(values.name, values.email, values.password)
      if (success) {
        toast({ title: 'Conta criada!', description: 'Seu cadastro foi realizado com sucesso.' })
        navigate('/')
      } else {
        const fieldErrors = extractFieldErrors(error)
        let hasFieldErrors = false

        if (fieldErrors.email) {
          form.setError('email', { message: fieldErrors.email })
          hasFieldErrors = true
        }
        if (fieldErrors.password) {
          form.setError('password', { message: fieldErrors.password })
          hasFieldErrors = true
        }
        if (fieldErrors.passwordConfirm) {
          form.setError('passwordConfirm', { message: fieldErrors.passwordConfirm })
          hasFieldErrors = true
        }
        if (fieldErrors.name) {
          form.setError('name', { message: fieldErrors.name })
          hasFieldErrors = true
        }

        toast({
          variant: 'destructive',
          title: 'Erro no cadastro',
          description: hasFieldErrors
            ? 'Verifique os erros nos campos informados.'
            : getErrorMessage(error) || 'Não foi possível criar a conta.',
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-border/50 shadow-elevation">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Criar conta</CardTitle>
        <CardDescription className="text-center">
          Preencha os dados abaixo para se cadastrar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
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
                  <FormLabel>Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passwordConfirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Senha</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>
        </Form>
        <div className="mt-6 text-center text-sm">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Entrar
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
