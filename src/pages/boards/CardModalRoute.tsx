import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerHeader,
} from '@/components/ui/drawer'
import { useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { CardDetail } from '@/components/cards/CardDetail'
import { useIsMobile } from '@/hooks/use-mobile'

export function CardModalRoute() {
  const { cardId } = useParams()
  const navigate = useNavigate()
  const { cards, board, columns, loadData } = useOutletContext<any>()
  const isMobile = useIsMobile()

  const card = cards.find((c: any) => c.id === cardId)

  const handleClose = () => {
    navigate(`/boards/${board.id}`)
  }

  if (!card) return null

  if (isMobile) {
    return (
      <Drawer open={true} onOpenChange={(o) => !o && handleClose()}>
        <DrawerContent className="h-[96vh] flex flex-col p-0 overflow-hidden">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Detalhes do Cartão</DrawerTitle>
            <DrawerDescription>Visualização e edição do cartão Kanban.</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto w-full">
            <CardDetail
              card={card}
              board={board}
              columns={columns}
              onChange={loadData}
              onClose={handleClose}
            />
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={true} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden bg-background rounded-xl border-border shadow-xl sm:rounded-xl">
        <DialogTitle className="sr-only">Detalhes do Cartão</DialogTitle>
        <DialogDescription className="sr-only">
          Visualização e edição do cartão Kanban.
        </DialogDescription>
        <CardDetail
          card={card}
          board={board}
          columns={columns}
          onChange={loadData}
          onClose={handleClose}
        />
      </DialogContent>
    </Dialog>
  )
}
