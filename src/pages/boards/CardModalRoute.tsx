import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useNavigate, useParams, useOutletContext } from 'react-router-dom'
import { CardDetail } from '@/components/cards/CardDetail'

export function CardModalRoute() {
  const { cardId } = useParams()
  const navigate = useNavigate()
  const { cards, board, columns, loadData } = useOutletContext<any>()

  const card = cards.find((c: any) => c.id === cardId)

  const handleClose = () => {
    navigate(`/boards/${board.id}`)
  }

  if (!card) return null

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
