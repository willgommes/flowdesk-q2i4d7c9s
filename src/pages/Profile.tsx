import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, ImageIcon } from 'lucide-react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageCropper } from '@/components/ImageCropper'

const profileSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  time_format: z.enum(['12h', '24h']).optional(),
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

const PRESET_AVATARS = [
  'https://img.usecurling.com/ppl/medium?gender=female&seed=1',
  'https://img.usecurling.com/ppl/medium?gender=male&seed=2',
  'https://img.usecurling.com/ppl/medium?gender=female&seed=3',
  'https://img.usecurling.com/ppl/medium?gender=male&seed=4',
  'https://img.usecurling.com/ppl/medium?gender=female&seed=5',
  'https://img.usecurling.com/ppl/medium?gender=male&seed=6',
]

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [isUpdating, setIsUpdating] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false)
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null)
  const [isGalleryDialogOpen, setIsGalleryDialogOpen] = useState(false)

  const avatarUrl = user?.avatar ? pb.files.getURL(user as any, user.avatar) : ''

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      time_format: user?.time_format || '24h',
    },
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  })

  useEffect(() => {
    return () => {
      if (cropImageUrl) URL.revokeObjectURL(cropImageUrl)
    }
  }, [cropImageUrl])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Arquivo muito grande',
          description: 'O arquivo é muito grande. O limite máximo é 2MB.',
        })
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      setCropImageUrl(URL.createObjectURL(file))
      setIsCropDialogOpen(true)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSelectPreset = async (url: string) => {
    if (!user) return
    setIsProcessing(true)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })

      const formData = new FormData()
      formData.append('avatar', file)

      await pb.collection('users').update(user.id, formData)

      setAvatarFile(null)
      setAvatarPreview(URL.createObjectURL(file))
      setIsGalleryDialogOpen(false)
      toast({ title: 'Sucesso', description: 'Foto de perfil atualizada com sucesso.' })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a imagem.',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  async function onProfileSubmit(values: z.infer<typeof profileSchema>) {
    if (!user) return
    setIsUpdating(true)
    try {
      const formData = new FormData()
      formData.append('name', values.name)
      formData.append('time_format', values.time_format || '24h')
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }
      await pb.collection('users').update(user.id, formData)
      setAvatarFile(null)
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
                <div className="relative inline-block group">
                  <Avatar
                    className="h-24 w-24 border shadow-sm cursor-pointer group-hover:opacity-80 transition-opacity"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <AvatarImage src={avatarPreview || avatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {user?.name?.substring(0, 2).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-full">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                  {(isProcessing || isUpdating) && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-full z-10">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3 max-w-sm">
                  <div className="text-sm text-muted-foreground">
                    Clique na imagem para enviar uma foto (Max 2MB).
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-fit gap-2"
                    onClick={() => setIsGalleryDialogOpen(true)}
                    disabled={isProcessing || isUpdating}
                    type="button"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Escolher da Galeria
                  </Button>
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
                  <FormField
                    control={profileForm.control}
                    name="time_format"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Formato de Hora</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="max-w-md">
                              <SelectValue placeholder="Selecione o formato de hora" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="24h">24 horas (ex: 14:30)</SelectItem>
                            <SelectItem value="12h">12 horas (ex: 02:30 PM)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isUpdating || isProcessing} className="mt-4">
                    {isUpdating ? 'Salvando...' : 'Salvar alterações'}
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

      <Dialog open={isCropDialogOpen} onOpenChange={setIsCropDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajustar Imagem</DialogTitle>
          </DialogHeader>
          {cropImageUrl && (
            <ImageCropper
              imageUrl={cropImageUrl}
              onCrop={(file) => {
                setAvatarFile(file)
                setAvatarPreview(URL.createObjectURL(file))
                setIsCropDialogOpen(false)
              }}
              onCancel={() => setIsCropDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isGalleryDialogOpen} onOpenChange={setIsGalleryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escolher da Galeria</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            {PRESET_AVATARS.map((url, i) => (
              <button
                key={i}
                type="button"
                className="relative aspect-square rounded-full overflow-hidden border-2 border-transparent hover:border-primary focus:border-primary transition-all disabled:opacity-50"
                onClick={() => handleSelectPreset(url)}
                disabled={isProcessing}
              >
                <img src={url} alt={`Avatar ${i + 1}`} className="object-cover w-full h-full" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
