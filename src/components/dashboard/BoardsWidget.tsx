import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FolderKanbanIcon, GripVertical } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export function BoardsWidget({ boards, loading }: { boards: any[]; loading: boolean }) {
  return (
    <Card className="flex flex-col h-full group/widget">
      <CardHeader className="pb-4 flex flex-row items-start justify-between space-y-0 cursor-grab active:cursor-grabbing">
        <CardTitle className="text-base flex items-center gap-2">
          <FolderKanbanIcon className="w-4 h-4 text-muted-foreground" />
          Meus Quadros
        </CardTitle>
        <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover/widget:text-foreground transition-colors" />
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {loading ? (
          <div className="grid grid-cols-1 divide-y divide-white/10 border-t border-white/10">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="w-10 h-10 rounded-md shrink-0" />
                <div className="overflow-hidden flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : boards.length > 0 ? (
          <div className="grid grid-cols-1 divide-y divide-white/10 border-t border-white/10">
            {boards.map((board) => (
              <Link key={board.id} to={`/boards/${board.id}`}>
                <div className="flex items-center gap-4 p-4 hover:bg-white/10 transition-colors group">
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
                    {(board.client_name || board.expand?.client_id) && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {board.expand?.client_id?.logo && (
                          <img
                            src={pb.files.getURL(
                              board.expand.client_id,
                              board.expand.client_id.logo,
                            )}
                            alt=""
                            className="w-3 h-3 object-contain rounded-sm"
                          />
                        )}
                        <p className="text-xs text-muted-foreground truncate">
                          {board.expand?.client_id?.name || board.client_name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center border-t border-white/10 bg-white/5">
            <p className="text-muted-foreground text-sm font-medium">
              Os quadros aparecerão aqui em breve.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
