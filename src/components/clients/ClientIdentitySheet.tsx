import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Copy, Download, Briefcase, FileImage, FileText } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function ClientIdentitySheet({ open, onOpenChange, client }: any) {
  const { toast } = useToast()

  if (!client) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copiado para a área de transferência' })
  }

  const getContractsArray = () => {
    if (!client.contract) return []
    return Array.isArray(client.contract) ? client.contract : [client.contract]
  }

  const getBrandAssetsArray = () => {
    if (!client.brand_assets) return []
    return Array.isArray(client.brand_assets) ? client.brand_assets : [client.brand_assets]
  }

  const contracts = getContractsArray()
  const brandAssets = getBrandAssetsArray()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Identidade: {client.name}
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="brand" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="brand">Arquivos da Marca</TabsTrigger>
            <TabsTrigger value="contracts">Contratos</TabsTrigger>
          </TabsList>

          <TabsContent value="brand" className="space-y-8 animate-fade-in">
            {client.logo && (
              <div>
                <h3 className="text-sm font-medium mb-3">Logo Principal</h3>
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

            {brandAssets.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Ativos da Marca (Secundários e Ícones)</h3>
                <div className="grid grid-cols-2 gap-3">
                  {brandAssets.map((filename: string, idx: number) => {
                    const isImage = filename.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i)
                    return (
                      <a
                        key={idx}
                        href={pb.files.getURL(client, filename)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border rounded-lg p-2 flex flex-col items-center justify-center bg-muted/10 hover:border-primary/50 transition-colors gap-2 group cursor-pointer"
                      >
                        <div className="w-full aspect-video flex items-center justify-center bg-background rounded border group-hover:bg-muted/30">
                          {isImage ? (
                            <img
                              src={pb.files.getURL(client, filename)}
                              alt={filename}
                              className="max-w-full max-h-full object-contain p-1"
                            />
                          ) : (
                            <FileImage className="w-8 h-8 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
                          )}
                        </div>
                        <span className="text-xs truncate w-full text-center px-1" title={filename}>
                          {filename}
                        </span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}

            {!client.logo &&
              (!client.palette || client.palette.length === 0) &&
              brandAssets.length === 0 && (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-sm">Nenhum ativo de marca configurado para este cliente.</p>
                </div>
              )}
          </TabsContent>

          <TabsContent value="contracts" className="space-y-6 animate-fade-in">
            {contracts.length > 0 ? (
              <div className="space-y-2">
                {contracts.map((filename: string, idx: number) => (
                  <a
                    key={idx}
                    href={pb.files.getURL(client, filename)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{filename}</span>
                    </div>
                    <Download className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors ml-2" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <p className="text-sm">Nenhum contrato salvo para este cliente.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
