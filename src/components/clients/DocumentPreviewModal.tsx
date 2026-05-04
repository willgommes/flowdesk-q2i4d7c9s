import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ExternalLink, Download } from 'lucide-react'

export function DocumentPreviewModal({ open, onOpenChange, url, filename }: any) {
  if (!url) return null

  const isImage = filename?.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i)
  const isPdf = filename?.match(/\.pdf$/i)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl w-[90vw] h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b shrink-0 flex flex-row items-center justify-between">
          <DialogTitle className="truncate pr-4" title={filename}>
            {filename}
          </DialogTitle>
          <div className="flex gap-2 mr-6">
            <Button variant="outline" size="sm" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Nova Aba
              </a>
            </Button>
            <Button variant="default" size="sm" asChild>
              <a href={url} download>
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </a>
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-muted/30 p-4 flex items-center justify-center">
          {isImage ? (
            <img src={url} alt={filename} className="max-w-full max-h-full object-contain" />
          ) : isPdf ? (
            <iframe src={`${url}#toolbar=0`} className="w-full h-full rounded-md border" />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground text-center">
              <p className="mb-4">
                Este tipo de arquivo não possui suporte nativo para visualização no navegador.
              </p>
              <Button asChild>
                <a href={url} download>
                  <Download className="w-4 h-4 mr-2" /> Baixar Arquivo
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
