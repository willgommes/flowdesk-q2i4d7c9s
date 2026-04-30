import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, MoreHorizontal } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/hooks/use-auth'
import { mockDb, User, Role } from '@/lib/mock-db'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu'

const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
})

export default function Users() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [isInviteOpen, setIsInviteOpen] = useState(false)

  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  })

  useEffect(() => {
    if (user?.role === 'admin') {
      setUsers(mockDb.getUsers())
    }
  }, [user])

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const handleInvite = (values: z.infer<typeof inviteSchema>) => {
    toast({ title: 'Convite enviado', description: `Um email foi enviado para ${values.email}.` })
    form.reset()
    setIsInviteOpen(false)
  }

  const handleRoleChange = (userId: string, newRole: Role) => {
    if (userId === user.id) {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Você não pode alterar seu próprio papel.',
      })
      return
    }
    const updated = mockDb.updateUser(userId, { role: newRole })
    if (updated) {
      setUsers(mockDb.getUsers())
      toast({
        title: 'Papel atualizado',
        description: `O papel do usuário foi alterado para ${newRole}.`,
      })
    }
  }

  const handleToggleStatus = (userId: string, currentStatus: string) => {
    if (userId === user.id) {
      toast({
        variant: 'destructive',
        title: 'Ação não permitida',
        description: 'Você não pode desativar a si mesmo.',
      })
      return
    }
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const updated = mockDb.updateUser(userId, { status: newStatus })
    if (updated) {
      setUsers(mockDb.getUsers())
      toast({
        title: 'Status atualizado',
        description: `Usuário ${newStatus === 'active' ? 'ativado' : 'desativado'}.`,
      })
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
      <AppHeader
        rightAction={
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 shadow-sm">
                <Plus className="w-4 h-4" /> Convidar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Envie um convite para adicionar um novo membro à plataforma.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleInvite)} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email do convidado</FormLabel>
                        <FormControl>
                          <Input placeholder="nome@agencia.com" {...field} />
                        </FormControl>
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
                    <Button type="submit">Enviar Convite</Button>
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
                <TableHead>Status</TableHead>
                <TableHead>Adicionado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className={u.status === 'inactive' ? 'opacity-60' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={u.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {u.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm leading-tight">
                          {u.name} {u.id === user.id && '(Você)'}
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
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-muted-foreground'}`}
                      />
                      <span className="text-sm capitalize">
                        {u.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(u.createdAt)}
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
                        <DropdownMenuSeparator />

                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal mt-1">
                          Alterar Papel
                        </DropdownMenuLabel>
                        <DropdownMenuRadioGroup
                          value={u.role}
                          onValueChange={(val) => handleRoleChange(u.id, val as Role)}
                        >
                          <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="membro">Membro</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="cliente">Cliente</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className={
                            u.status === 'active' ? 'text-destructive focus:text-destructive' : ''
                          }
                          onClick={() => handleToggleStatus(u.id, u.status)}
                        >
                          {u.status === 'active' ? 'Desativar Usuário' : 'Ativar Usuário'}
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
