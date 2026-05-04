import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { X, Upload, FileText } from 'lucide-react'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export function ClientModal({ open, onOpenChange, client, onSuccess }: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('active')
  const [palette, setPalette] = useState<any[]>([])

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [contractFiles, setContractFiles] = useState<File[]>([])

  const [newColorHex, setNewColorHex] = useState('#000000')
  const [newColorName, setNewColorName] = useState('')

  const logoInputRef = useRef<HTMLInputElement>(null)
  const contractInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      if (client) {
        setName(client.name)
        setStatus(client.status)
        setPalette(client.palette || [])
      } else {
        setName('')
        setStatus('active')
        setPalette([])
      }
      setLogoFile(null)
      setContractFiles([])
      setNewColorHex('#000000')
      setNewColorName('')
    }
  }, [open, client])

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : ''
  }

  const handleAddColor = () => {
    if (!newColorHex || !newColorName.trim()) return
    setPalette([
      ...palette,
      { hex: newColorHex, rgb: hexToRgb(newColorHex), name: newColorName.trim() },
    ])
    setNewColorName('')
  }

  const handleRemoveColor = (idx: number) => {
    setPalette(palette.filter((_, i) => i !== idx))
  }

  const handleRemoveContractFile = (idx: number) => {
    setContractFiles(contractFiles.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('status', status)
      formData.append('palette', JSON.stringify(palette))

      if (logoFile) {
        formData.append('logo', logoFile)
      }

      contractFiles.forEach((file) => {
        formData.append('contract+', file)
      })

      if (client) {
        await pb.collection('clients').update(client.id, formData)
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
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0 border-b bg-muted/10">
          <DialogTitle>{client ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <form id="client-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Nome do Cliente *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
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

            <div className="space-y-2">
              <Label>Logo do Cliente</Label>
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
                    onChange={(e) => {
                      if (e.target.files?.[0]) setLogoFile(e.target.files[0])
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
              <div className="flex gap-2 items-end">
                <div className="space-y-1 shrink-0">
                  <Input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-12 h-10 p-1 cursor-pointer"
                  />
                </div>
                <div className="space-y-1 flex-1">
                  <Input
                    placeholder="Nome da cor (ex: Primária)"
                    value={newColorName}
                    onChange={(e) => setNewColorName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddColor()
                      }
                    }}
                  />
                </div>
                <Button type="button" onClick={handleAddColor} variant="secondary">
                  Adicionar
                </Button>
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

            <div className="space-y-2">
              <Label>Contratos e Documentos</Label>
              <div>
                <Input
                  type="file"
                  multiple
                  ref={contractInputRef}
                  className="hidden"
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
                  onClick={() => contractInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" /> Adicionar Arquivos
                </Button>
              </div>

              {client?.contract && client.contract.length > 0 && contractFiles.length === 0 && (
                <div className="text-xs text-muted-foreground mt-2 border border-border/60 p-3 rounded-md bg-muted/10">
                  <p className="mb-1 font-medium text-foreground">Arquivos atuais:</p>
                  <ul className="space-y-1 list-disc list-inside pl-1">
                    {client.contract.map((c: string, i: number) => (
                      <li key={i} className="truncate">
                        {c}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-primary">
                    Nota: Novos uploads serão adicionados aos arquivos existentes.
                  </p>
                </div>
              )}

              {contractFiles.length > 0 && (
                <div className="space-y-2 mt-3">
                  <p className="text-xs font-medium">Novos arquivos selecionados:</p>
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
          </form>
        </div>

        <DialogFooter className="p-6 pt-4 shrink-0 border-t bg-muted/10">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">
            Cancelar
          </Button>
          <Button type="submit" form="client-form" disabled={loading || !name.trim()}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
