import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export function Comments({ cardId, comments, onChange }: any) {
  const [content, setContent] = useState('')
  const { user } = useAuth()

  const handleAdd = async () => {
    if (!content.trim()) return
    await pb.collection('comments').create({
      card_id: cardId,
      user_id: user.id,
      content,
    })
    await pb.collection('activity_logs').create({
      card_id: cardId,
      user_id: user.id,
      action_type: 'comment_add',
      description: 'Adicionou um comentário',
    })
    setContent('')
    onChange()
  }

  const remove = async (id: string) => {
    if (!confirm('Excluir comentário?')) return
    await pb.collection('comments').delete(id)
    onChange()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Avatar className="w-8 h-8">
          <AvatarFallback>{user?.name?.[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva um comentário..."
            className="min-h-[80px]"
          />
          <Button onClick={handleAdd} size="sm">
            Salvar Comentário
          </Button>
        </div>
      </div>
      <div className="space-y-4 pt-4 border-t">
        {comments
          .sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime())
          .map((c: any) => (
            <div key={c.id} className="flex gap-3 group">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={
                    c.expand?.user_id?.avatar
                      ? pb.files.getURL(c.expand.user_id, c.expand.user_id.avatar)
                      : ''
                  }
                />
                <AvatarFallback>{c.expand?.user_id?.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{c.expand?.user_id?.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created).toLocaleString()}
                    </span>
                  </div>
                  {c.user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => remove(c.id)}
                    >
                      ×
                    </Button>
                  )}
                </div>
                <p className="text-sm mt-1 bg-muted/50 p-3 rounded-lg">{c.content}</p>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
