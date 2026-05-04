import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Copy, Download, Briefcase } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export function ClientIdentitySheet({ open, onOpenChange, client }: any) {
  const { toast } = useToast()

  if (!client) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copiado para a área de transferência' })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Identidade: {client.name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-8">
          {client.logo && (
            <div>
              <h3 className="text-sm font-medium mb-3">Logo do Cliente</h3>
              <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-center border border-border/50">
                <img
                  src={pb.files.getURL(client, client.logo)}
                  alt={client.name}
                  className="max-w-full max-h-32 object-contain"
                />
              </div>
            </div>
          )}

          {client.palette && client.palette.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Paleta de Cores</h3>
              <div className="grid grid-cols-2 gap-3">
                {client.palette.map((color: any, idx: number) => (
                  <div key={idx} className="border rounded-lg overflow-hidden flex flex-col">
                    <div
                      className="h-16 w-full shadow-inner"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div className="p-2 text-xs space-y-1 bg-muted/10">
                      <div className="font-medium truncate mb-1">{color.name}</div>
                      <div
                        className="flex items-center justify-between group cursor-pointer hover:bg-muted p-1 -mx-1 rounded"
                        onClick={() => copyToClipboard(color.hex)}
                      >
                        <span>{color.hex}</span>
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />
                      </div>
                      <div
                        className="flex items-center justify-between group cursor-pointer hover:bg-muted p-1 -mx-1 rounded"
                        onClick={() => copyToClipboard(color.rgb)}
                      >
                        <span className="truncate pr-1">RGB: {color.rgb}</span>
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {client.contract && client.contract.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Contratos e Documentos</h3>
              <div className="space-y-2">
                {client.contract.map((filename: string, idx: number) => (
                  <a
                    key={idx}
                    href={pb.files.getURL(client, filename)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors group"
                  >
                    <span className="text-sm font-medium truncate mr-2">{filename}</span>
                    <Download className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {!client.logo &&
            (!client.palette || client.palette.length === 0) &&
            (!client.contract || client.contract.length === 0) && (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <p className="text-sm">Nenhum ativo configurado para este cliente.</p>
              </div>
            )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
