import { useEffect, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArchiveRestore, Trash2, ArchiveX } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface ArchivedCardsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
}

export function ArchivedCardsSheet({ open, onOpenChange, boardId }: ArchivedCardsSheetProps) {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const loadArchivedCards = async () => {
    if (!boardId || !open) return
    setLoading(true)
    try {
      const records = await pb.collection('cards').getFullList({
        filter: `board_id = '${boardId}' && archived = true`,
        expand: 'column_id',
        sort: '-updated',
      })
      setCards(records)
    } catch (err) {
      toast({ title: 'Erro ao carregar cartões arquivados', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadArchivedCards()
    }
  }, [open, boardId])

  useRealtime(
    'cards',
    (e) => {
      if (e.record.board_id === boardId) {
        loadArchivedCards()
      }
    },
    open,
  )

  const handleRestore = async (id: string) => {
    try {
      await pb.collection('cards').update(id, { archived: false })
      toast({ title: 'Cartão restaurado com sucesso' })
    } catch (err) {
      toast({
        title: 'Erro ao restaurar cartão',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Tem certeza que deseja excluir este cartão permanentemente? Esta ação não pode ser desfeita.',
      )
    )
      return
    try {
      await pb.collection('cards').delete(id)
      toast({ title: 'Cartão excluído permanentemente' })
    } catch (err) {
      toast({
        title: 'Erro ao excluir cartão',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Cartões Arquivados</SheetTitle>
          <SheetDescription>
            Gerencie os cartões que foram arquivados neste quadro. Você pode restaurá-los para suas
            colunas originais ou excluí-los permanentemente.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 mt-6 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : cards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed border-border/60">
                <ArchiveX className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm font-medium">Nenhum cartão arquivado encontrado.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-muted/30 border border-border rounded-lg p-4 flex flex-col gap-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <h4 className="font-medium text-sm leading-tight mb-2">{card.title}</h4>
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        Coluna: {card.expand?.column_id?.name || 'Desconhecida'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 justify-end mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(card.id)}
                        className="h-8 text-xs bg-background"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5 mr-1.5" />
                        Restaurar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(card.id)}
                        className="h-8 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Excluir Permanentemente
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
