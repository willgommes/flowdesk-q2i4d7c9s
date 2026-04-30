import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderKanbanIcon, GripVertical } from 'lucide-react'

export function BoardsWidget({ boards, loading }: { boards: any[]; loading: boolean }) {
  return (
    <Card className="border-border/60 shadow-subtle flex flex-col h-full bg-card group/widget">
      <CardHeader className="pb-4 flex flex-row items-start justify-between space-y-0 cursor-grab active:cursor-grabbing">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderKanbanIcon className="w-4 h-4 text-muted-foreground" />
          Meus Quadros
        </CardTitle>
        <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover/widget:text-foreground transition-colors" />
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="h-32 flex items-center justify-center border-t border-border/30 bg-muted/5">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : boards.length > 0 ? (
          <div className="grid grid-cols-1 divide-y divide-border/30 border-t border-border/30">
            {boards.map((board) => (
              <Link key={board.id} to={`/boards/${board.id}`}>
                <div className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors group">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: board.color || '#e2e8f0' }}
                  >
                    <span className="text-lg">{board.icon || '📁'}</span>
                  </div>
                  <div className="overflow-hidden flex-1">
                    <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                      {board.name}
                    </h4>
                    {board.client_name && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {board.client_name}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center border-t border-border/30 bg-muted/5">
            <p className="text-muted-foreground text-sm font-medium">
              Os quadros aparecerão aqui em breve.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
