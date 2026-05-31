import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { X, Upload, FileText, FileImage, Trash2, Eye } from 'lucide-react'
import { DocumentPreviewModal } from '@/components/clients/DocumentPreviewModal'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export function ClientModal({ open, onOpenChange, client, onSuccess }: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('active')
  const [palette, setPalette] = useState<any[]>([])

  const [contractStatus, setContractStatus] = useState<string>('pending_signature')
  const [contractExpirationDate, setContractExpirationDate] = useState<string>('')

  const [previewUrl, setPreviewUrl] = useState('')
  const [previewFilename, setPreviewFilename] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [contractFiles, setContractFiles] = useState<File[]>([])
  const [brandAssetsFiles, setBrandAssetsFiles] = useState<File[]>([])

  const [savedContracts, setSavedContracts] = useState<string[]>([])
  const [savedBrandAssets, setSavedBrandAssets] = useState<string[]>([])
  const [fileToDelete, setFileToDelete] = useState<{
    type: 'contract' | 'brand_assets'
    filename: string
  } | null>(null)

  const [newColorHex, setNewColorHex] = useState('#000000')
  const [newColorName, setNewColorName] = useState('')

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)

  const logoInputRef = useRef<HTMLInputElement>(null)
  const contractInputRef = useRef<HTMLInputElement>(null)
  const brandAssetsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      if (client) {
        setName(client.name)
        setStatus(client.status)
        setPalette(client.palette || [])
        setContractStatus(client.contract_status || 'pending_signature')
        setContractExpirationDate(
          client.contract_expiration_date ? client.contract_expiration_date.split('T')[0] : '',
        )
        setSavedContracts(
          Array.isArray(client.contract)
            ? client.contract
            : client.contract
              ? [client.contract]
              : [],
        )
        setSavedBrandAssets(
          Array.isArray(client.brand_assets)
            ? client.brand_assets
            : client.brand_assets
              ? [client.brand_assets]
              : [],
        )
      } else {
        setName('')
        setStatus('active')
        setPalette([])
        setContractStatus('pending_signature')
        setContractExpirationDate('')
        setSavedContracts([])
        setSavedBrandAssets([])
      }
      setLogoFile(null)
      setContractFiles([])
      setBrandAssetsFiles([])
      setNewColorHex('#000000')
      setNewColorName('')
      setShowArchiveConfirm(false)
      setPendingFormData(null)
      setFileToDelete(null)
    }
  }, [open, client])

  const parseColor = (input: string) => {
    let hex = input.trim()
    let rgb = ''

    if (hex.startsWith('rgb')) {
      const match = hex.match(/\d+/g)
      if (match && match.length >= 3) {
        rgb = `${match[0]}, ${match[1]}, ${match[2]}`
        hex =
          '#' +
          match
            .slice(0, 3)
            .map((x) => parseInt(x).toString(16).padStart(2, '0'))
            .join('')
      }
    } else {
      if (!hex.startsWith('#')) hex = '#' + hex
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      if (result) {
        rgb = `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      }
    }
    return { hex, rgb }
  }

  const handleAddColor = () => {
    if (!newColorHex || !newColorName.trim()) return
    const { hex, rgb } = parseColor(newColorHex)
    setPalette([...palette, { hex, rgb, name: newColorName.trim() }])
    setNewColorName('')
    setNewColorHex('#000000')
  }

  const handleRemoveColor = (idx: number) => {
    setPalette(palette.filter((_, i) => i !== idx))
  }

  const handleRemoveContractFile = (idx: number) => {
    setContractFiles(contractFiles.filter((_, i) => i !== idx))
  }

  const handleRemoveBrandAssetFile = (idx: number) => {
    setBrandAssetsFiles(brandAssetsFiles.filter((_, i) => i !== idx))
  }

  const handleDeleteSavedFileConfirm = async () => {
    if (!fileToDelete || !client) return
    try {
      setLoading(true)

      const isContract = fileToDelete.type === 'contract'
      const currentFiles = isContract ? savedContracts : savedBrandAssets
      const newFiles = currentFiles.filter((f) => f !== fileToDelete.filename)

      await pb.collection('clients').update(client.id, {
        [`${fileToDelete.type}-`]: fileToDelete.filename,
      })

      if (isContract) setSavedContracts(newFiles)
      else setSavedBrandAssets(newFiles)

      toast({ title: 'Arquivo removido com sucesso' })
      onSuccess()
    } catch (err) {
      toast({
        title: 'Erro ao remover arquivo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setFileToDelete(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const formData = new FormData()
    formData.append('name', name)
    formData.append('status', status)
    formData.append('palette', JSON.stringify(palette))
    formData.append('contract_status', contractStatus)

    if (contractExpirationDate) {
      formData.append('contract_expiration_date', new Date(contractExpirationDate).toISOString())
    } else {
      formData.append('contract_expiration_date', '')
    }

    if (logoFile) {
      formData.append('logo', logoFile)
    }

    contractFiles.forEach((file) => {
      formData.append('contract+', file)
    })

    brandAssetsFiles.forEach((file) => {
      formData.append('brand_assets+', file)
    })

    if (client && client.status === 'active' && (status === 'inactive' || status === 'archived')) {
      setPendingFormData(formData)
      setShowArchiveConfirm(true)
      return
    }

    await executeSave(formData, false)
  }

  const executeSave = async (formData: FormData, archiveBoards: boolean) => {
    setLoading(true)
    try {
      if (client) {
        await pb.collection('clients').update(client.id, formData)

        if (archiveBoards) {
          const boards = await pb
            .collection('boards')
            .getFullList({ filter: `client_id = '${client.id}' && archived != true` })
          for (const b of boards) {
            await pb.collection('boards').update(b.id, { archived: true })
          }
        }
        toast({ title: 'Cliente atualizado com sucesso' })
      } else {
        await pb.collection('clients').create(formData)
        toast({ title: 'Cliente criado com sucesso' })
      }

      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setLoading(false)
      setShowArchiveConfirm(false)
      setPendingFormData(null)
    }
  }

  const openPreview = (url: string, filename: string) => {
    setPreviewUrl(url)
    setPreviewFilename(filename)
    setPreviewOpen(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white/10 backdrop-blur-xl border border-white/10 text-gray-100">
          <DialogHeader className="p-6 pb-4 shrink-0 border-b border-white/10 bg-white/5">
            <DialogTitle>{client ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 pt-2">
            <form id="client-form" onSubmit={handleSubmit}>
              <Tabs defaultValue="brand" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="general">Geral</TabsTrigger>
                  <TabsTrigger value="brand">Arquivos da Marca</TabsTrigger>
                  <TabsTrigger value="contracts">Contratos</TabsTrigger>
                </TabsList>

                {/* ABA GERAL */}
                <TabsContent value="general" className="space-y-6 mt-0 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <Label>Nome do Cliente *</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <Label>Status</Label>
                      <Select value={status} onValueChange={setStatus} disabled={loading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Ativo</SelectItem>
                          <SelectItem value="inactive">Inativo</SelectItem>
                          <SelectItem value="archived">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* ABA ARQUIVOS DA MARCA */}
                <TabsContent value="brand" className="space-y-6 mt-0 animate-fade-in">
                  <div className="space-y-2">
                    <Label>Logo Principal</Label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                        {logoFile ? (
                          <img
                            src={URL.createObjectURL(logoFile)}
                            alt="Preview"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : client?.logo ? (
                          <img
                            src={pb.files.getURL(client, client.logo)}
                            alt="Logo"
                            className="w-full h-full object-contain p-1"
                          />
                        ) : (
                          <Upload className="w-6 h-6 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          ref={logoInputRef}
                          className="hidden"
                          disabled={loading}
                          onChange={(e) => {
                            if (e.target.files?.[0]) setLogoFile(e.target.files[0])
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={loading}
                          onClick={() => logoInputRef.current?.click()}
                        >
                          Selecionar Imagem
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">Imagens (Máx. 5MB)</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Paleta de Cores</Label>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2 items-end">
                        <div className="space-y-1 shrink-0 relative">
                          <Input
                            type="color"
                            value={
                              newColorHex.startsWith('#') && newColorHex.length === 7
                                ? newColorHex
                                : '#000000'
                            }
                            onChange={(e) => setNewColorHex(e.target.value)}
                            disabled={loading}
                            className="w-12 h-10 p-1 cursor-pointer absolute opacity-0 inset-0"
                          />
                          <div
                            className="w-12 h-10 rounded-md border shadow-sm flex items-center justify-center pointer-events-none"
                            style={{
                              backgroundColor:
                                newColorHex.startsWith('#') || newColorHex.startsWith('rgb')
                                  ? newColorHex
                                  : '#000000',
                            }}
                          />
                        </div>
                        <div className="space-y-1 flex-1">
                          <Input
                            placeholder="HEX ou RGB"
                            value={newColorHex}
                            onChange={(e) => setNewColorHex(e.target.value)}
                            disabled={loading}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newColorName.trim()) {
                                e.preventDefault()
                                handleAddColor()
                              }
                            }}
                          />
                        </div>
                        <div className="space-y-1 flex-1">
                          <Input
                            placeholder="Nome da cor"
                            value={newColorName}
                            onChange={(e) => setNewColorName(e.target.value)}
                            disabled={loading}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddColor()
                              }
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={handleAddColor}
                          variant="secondary"
                          disabled={loading}
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>

                    {palette.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {palette.map((color, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between border rounded-md p-2 text-sm bg-muted/10 shadow-sm"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div
                                className="w-4 h-4 rounded-full border shadow-sm shrink-0"
                                style={{ backgroundColor: color.hex }}
                              />
                              <span className="truncate font-medium">{color.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={loading}
                              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveColor(idx)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <Label>Ativos da Marca (Secundários, Ícones, Diretrizes)</Label>
                    <div>
                      <Input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.svg"
                        ref={brandAssetsInputRef}
                        className="hidden"
                        disabled={loading}
                        onChange={(e) => {
                          if (e.target.files) {
                            setBrandAssetsFiles([
                              ...brandAssetsFiles,
                              ...Array.from(e.target.files),
                            ])
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => brandAssetsInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" /> Adicionar Ativos
                      </Button>
                    </div>

                    {savedBrandAssets.length > 0 && brandAssetsFiles.length === 0 && (
                      <div className="text-xs text-muted-foreground mt-2 border border-border/60 p-3 rounded-md bg-muted/10">
                        <p className="mb-2 font-medium text-foreground">
                          Ativos salvos ({savedBrandAssets.length}):
                        </p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {savedBrandAssets.map((c: string, i: number) => (
                            <div
                              key={i}
                              className="relative group w-12 h-12 border rounded bg-background shrink-0 flex items-center justify-center overflow-hidden"
                              title={c}
                            >
                              {c.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? (
                                <img
                                  src={pb.files.getURL(client, c)}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <FileImage className="w-5 h-5 text-muted-foreground" />
                              )}
                              <div className="absolute inset-0 bg-black/50 hidden group-hover:flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 text-white hover:text-white hover:bg-white/20"
                                  onClick={() => openPreview(pb.files.getURL(client, c), c)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 text-destructive hover:text-destructive hover:bg-destructive/20"
                                  onClick={() =>
                                    setFileToDelete({ type: 'brand_assets', filename: c })
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-primary mt-1">
                          Novos uploads serão adicionados aos arquivos existentes.
                        </p>
                      </div>
                    )}

                    {brandAssetsFiles.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <p className="text-xs font-medium">Novos ativos selecionados:</p>
                        {brandAssetsFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between border rounded-md p-2 text-sm bg-muted/5"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileImage className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={loading}
                              className="h-6 w-6 shrink-0"
                              onClick={() => handleRemoveBrandAssetFile(idx)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ABA CONTRATOS */}
                <TabsContent value="contracts" className="space-y-6 mt-0 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <Label>Status do Contrato</Label>
                      <Select
                        value={contractStatus}
                        onValueChange={setContractStatus}
                        disabled={loading}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Em Vigência</SelectItem>
                          <SelectItem value="expired">Expirado</SelectItem>
                          <SelectItem value="signed">Assinado</SelectItem>
                          <SelectItem value="pending_signature">Aguardando Assinatura</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <Label>Data de Vencimento</Label>
                      <Input
                        type="date"
                        value={contractExpirationDate}
                        onChange={(e) => setContractExpirationDate(e.target.value)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <Label>Contratos e Documentos Legais</Label>
                    <div>
                      <Input
                        type="file"
                        multiple
                        ref={contractInputRef}
                        className="hidden"
                        disabled={loading}
                        onChange={(e) => {
                          if (e.target.files) {
                            setContractFiles([...contractFiles, ...Array.from(e.target.files)])
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        onClick={() => contractInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" /> Adicionar Contratos
                      </Button>
                    </div>

                    {savedContracts.length > 0 && contractFiles.length === 0 && (
                      <div className="text-xs text-muted-foreground mt-2 border border-border/60 p-3 rounded-md bg-muted/10">
                        <p className="mb-1 font-medium text-foreground">
                          Contratos salvos ({savedContracts.length}):
                        </p>
                        <ul className="space-y-2 mt-2">
                          {savedContracts.map((c: string, i: number) => (
                            <li
                              key={i}
                              className="flex items-center justify-between bg-background p-2 rounded border shadow-sm"
                            >
                              <span className="truncate mr-2 flex-1 text-sm" title={c}>
                                {c}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  onClick={() => openPreview(pb.files.getURL(client, c), c)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setFileToDelete({ type: 'contract', filename: c })}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-primary">
                          Novos uploads serão adicionados aos contratos existentes.
                        </p>
                      </div>
                    )}

                    {contractFiles.length > 0 && (
                      <div className="space-y-2 mt-3">
                        <p className="text-xs font-medium">Novos contratos selecionados:</p>
                        {contractFiles.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between border rounded-md p-2 text-sm bg-muted/5"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="truncate">{file.name}</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={loading}
                              className="h-6 w-6 shrink-0"
                              onClick={() => handleRemoveContractFile(idx)}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </form>
          </div>

          <DialogFooter className="p-6 pt-4 shrink-0 border-t border-white/10 bg-white/5">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              type="button"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" form="client-form" disabled={loading || !name.trim()}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showArchiveConfirm} onOpenChange={setShowArchiveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar quadros?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja arquivar automaticamente todos os quadros vinculados a este cliente?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                if (pendingFormData) executeSave(pendingFormData, false)
              }}
            >
              Não, apenas alterar status
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingFormData) executeSave(pendingFormData, true)
              }}
            >
              Sim, arquivar quadros
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este arquivo? Esta ação atualizará o cliente
              imediatamente e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSavedFileConfirm}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {loading ? 'Removendo...' : 'Sim, remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        url={previewUrl}
        filename={previewFilename}
      />
    </>
  )
}
