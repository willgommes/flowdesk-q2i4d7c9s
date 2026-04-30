import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AppHeader } from '@/components/AppHeader'
import { Separator } from '@/components/ui/separator'

const profileSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  avatar: z.string().url('URL inválida').or(z.literal('')),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'Nova senha deve ter no mínimo 6 caracteres'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmNewPassword'],
  })

export default function Profile() {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', avatar: user?.avatar || '' },
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  })

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    setIsUpdating(true)
    setTimeout(() => {
      updateProfile({ name: values.name, avatar: values.avatar || undefined })
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      })
      setIsUpdating(false)
    }, 500)
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setIsUpdating(true)
    setTimeout(() => {
      toast({ title: 'Senha atualizada', description: 'Sua senha foi alterada com sucesso.' })
      passwordForm.reset()
      setIsUpdating(false)
    }, 500)
  }

  return (
    <>
      <AppHeader />
      <div className="p-8 max-w-3xl mx-auto w-full animate-fade-in">
        <div className="flex flex-col md:flex-row gap-12">
          <div className="flex-1 space-y-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-4">Informações Pessoais</h2>
              <div className="flex items-center gap-6 mb-6">
                <Avatar className="h-20 w-20 border shadow-sm">
                  <AvatarImage src={profileForm.watch('avatar') || user?.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {user?.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground max-w-sm">
                  A imagem do seu perfil é visível para todos os membros da organização.
                </div>
              </div>

              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} className="max-w-md" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="avatar"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL do Avatar (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} className="max-w-md" placeholder="https://..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isUpdating} className="mt-4">
                    Salvar alterações
                  </Button>
                </form>
              </Form>
            </div>

            <Separator />

            <div>
              <h2 className="text-xl font-semibold tracking-tight mb-4">Segurança</h2>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-4 max-w-md"
                >
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha Atual</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmNewPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isUpdating} variant="secondary" className="mt-4">
                    Atualizar senha
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
