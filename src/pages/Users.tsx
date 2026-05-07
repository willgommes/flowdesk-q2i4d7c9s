import { useState, useEffect, useRef } from 'react'
import { Plus, MoreHorizontal, Trash2, Camera, Loader2, AlertCircle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { isToday, parseISO } from 'date-fns'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth, type User } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nome é obrigatório'),
  role: z.enum(['admin', 'membro', 'cliente']).default('membro'),
})

export default function Users() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [uploadingUserId, setUploadingUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', name: '', role: 'membro' },
  })

  const handleAvatarClick = (userId: string) => {
    setSelectedUserId(userId)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedUserId) return

    setUploadingUserId(selectedUserId)
    try {
      const formData = new FormData()
      formData.append('avatar', file)
      await pb.collection('users').update(selectedUserId, formData)
      toast({
        title: 'Avatar atualizado',
        description: 'A foto de perfil foi alterada com sucesso.',
      })
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      const errorMsg = fieldErrors.avatar || getErrorMessage(err)
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar avatar',
        description: errorMsg,
      })
    } finally {
      setUploadingUserId(null)
      setSelectedUserId(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const loadUsers = async () => {
    try {
      const records = await pb.collection('users').getFullList<User>({ sort: '-created' })
      setUsers(records)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useRealtime('users', () => {
    loadUsers()
  })

  const handleInvite = async (values: z.infer<typeof inviteSchema>) => {
    try {
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!'
      await pb.collection('users').create({
        email: values.email,
        name: values.name,
        role: values.role,
        password: tempPassword,
        passwordConfirm: tempPassword,
      })
      await pb.collection('users').requestPasswordReset(values.email)

      toast({
        title: 'Usuário criado',
        description: `Um email de redefinição foi enviado para ${values.email}.`,
      })
      form.reset()
      setIsInviteOpen(false)
    } catch (err) {
      const fieldErrors = extractFieldErrors(err)
      if (fieldErrors.email) form.setError('email', { message: fieldErrors.email })
      toast({ variant: 'destructive', title: 'Erro ao criar', description: getErrorMessage(err) })
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === user?.id) {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Você não pode alterar seu próprio papel.',
      })
      return
    }
    try {
      await pb.collection('users').update(userId, { role: newRole })
      toast({
        title: 'Papel atualizado',
        description: `O papel do usuário foi alterado para ${newRole}.`,
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getErrorMessage(err) })
    }
  }

  const handleToggleRoutineManagement = async (userId: string, checked: boolean) => {
    try {
      await pb.collection('users').update(userId, { can_manage_routines: checked })
      toast({
        title: 'Permissão atualizada',
        description: checked
          ? 'Usuário agora pode gerenciar rotinas.'
          : 'Permissão de gerenciar rotinas removida.',
      })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getErrorMessage(err) })
    }
  }

  const handleDelete = async (userId: string) => {
    if (userId === user?.id) {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Você não pode excluir a si mesmo.',
      })
      return
    }
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return

    try {
      await pb.collection('users').delete(userId)
      toast({ title: 'Usuário excluído', description: 'O usuário foi removido com sucesso.' })
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: getErrorMessage(err) })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg, image/png, image/webp, image/gif"
        onChange={handleFileChange}
      />
      <AppHeader
        rightAction={
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 shadow-sm">
                <Plus className="w-4 h-4" /> Adicionar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Crie um novo usuário para ter acesso à plataforma.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleInvite)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do usuário" {...field} />
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
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Papel</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um papel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="membro">Membro</SelectItem>
                            <SelectItem value="cliente">Cliente</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button type="submit">Adicionar Usuário</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="p-8 max-w-6xl mx-auto w-full animate-fade-in">
        <div className="rounded-md border bg-card overflow-hidden shadow-subtle">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Adicionado em</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead>Gerenciar Rotinas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 relative overflow-hidden">
                        <AvatarImage src={u.avatar ? pb.files.getURL(u as any, u.avatar) : ''} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {u.name?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                        {uploadingUserId === u.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          </div>
                        )}
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm leading-tight flex items-center gap-2">
                          {u.name} {u.id === user?.id && '(Você)'}
                          {u.role === 'membro' &&
                            (!u.last_briefing_at || !isToday(parseISO(u.last_briefing_at))) &&
                            new Date().getHours() >= 10 && (
                              <Tooltip>
                                <TooltipTrigger>
                                  <AlertCircle className="w-4 h-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>Briefing diário pendente (Atrasado)</TooltipContent>
                              </Tooltip>
                            )}
                        </span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={u.role === 'admin' ? 'default' : 'secondary'}
                      className="capitalize font-medium"
                    >
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(u.created)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.lastActive ? formatDate(u.lastActive) : 'Nunca'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.role === 'admin' || !!u.can_manage_routines}
                      disabled={u.role === 'admin'}
                      onCheckedChange={(checked) => handleToggleRoutineManagement(u.id, checked)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => handleAvatarClick(u.id)}
                          className="cursor-pointer"
                        >
                          <Camera className="w-4 h-4 mr-2" /> Alterar Foto
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal mt-1">
                          Alterar Papel
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={u.role}
                          onValueChange={(val) => handleRoleChange(u.id, val)}
                        >
                          <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="membro">Membro</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="cliente">Cliente</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => handleDelete(u.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir Usuário
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
