import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
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
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(8, 'Nova senha deve ter no mínimo 8 caracteres'),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmNewPassword'],
  })

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const avatarUrl = user?.avatar ? pb.files.getURL(user as any, user.avatar) : ''

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '' },
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      setAvatarPreview(URL.createObjectURL(file))
    }
  }

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    if (!user) return
    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('name', values.name)
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }
      await pb.collection('users').update(user.id, formData)
      toast({
        title: 'Perfil atualizado',
        description: 'Suas informações foram salvas com sucesso.',
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getErrorMessage(err) })
    } finally {
      setIsUpdating(false)
    }
  }

  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    if (!user) return
    setIsUpdating(true)
    try {
      await pb.collection('users').update(user.id, {
        oldPassword: values.currentPassword,
        password: values.newPassword,
        passwordConfirm: values.confirmNewPassword,
      })
      toast({ title: 'Senha atualizada', description: 'Sua senha foi alterada com sucesso.' })
      passwordForm.reset()
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.oldPassword)
        passwordForm.setError('currentPassword', { message: fieldErrors.oldPassword })
      if (fieldErrors.password)
        passwordForm.setError('newPassword', { message: fieldErrors.password })
      if (fieldErrors.passwordConfirm)
        passwordForm.setError('confirmNewPassword', { message: fieldErrors.passwordConfirm })

      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Verifique os dados informados.',
      })
    } finally {
      setIsUpdating(false)
    }
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
                <Avatar
                  className="h-20 w-20 border shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <AvatarImage src={avatarPreview || avatarUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">
                    {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-sm text-muted-foreground max-w-sm">
                  Clique na imagem para alterar. A imagem do seu perfil é visível para todos os
                  membros.
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleFileChange}
                />
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
