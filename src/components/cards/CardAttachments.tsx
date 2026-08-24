import { useState, useRef, useEffect } from 'react'
import JSZip from 'jszip'
import {
  Paperclip,
  FolderPlus,
  Folder,
  FolderOpen,
  Download,
  Loader2,
  Trash2,
  Pencil,
  FileText,
  FileType,
  UploadCloud,
  ChevronDown,
  ChevronRight,
  MoveRight,
  Check,
  X,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'

export interface VirtualFolder {
  id: string
  name: string
  created?: string
}

export interface AttachmentRecord {
  id: string
  card_id: string
  file: string
  name: string
  type?: string
  size?: number
  folder_id?: string | null
  user_id?: string
  created?: string
  updated?: string
  [key: string]: any
}

interface CardAttachmentsProps {
  card: any
  userId: string
  attachments: AttachmentRecord[]
  onChange: () => void
  logAct: (type: string, desc: string, targetCardId?: string) => Promise<void>
  onPreview: (att: any) => void
  onImagePreview: (att: any) => void
}

export const getFileKind = (a: any): 'image' | 'pdf' | 'doc' | 'video' | 'audio' | 'file' => {
  const type = (a.type || '').toLowerCase()
  const name = (a.name || '').toLowerCase()
  if (type.includes('image')) return 'image'
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (
    type.includes('word') ||
    type.includes('officedocument.wordprocessing') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx')
  )
    return 'doc'
  if (type.includes('video')) return 'video'
  if (type.includes('audio')) return 'audio'
  return 'file'
}

const FileIcon = ({ kind, className }: { kind: string; className?: string }) => {
  if (kind === 'doc' || kind === 'pdf') return <FileText className={className} />
  if (kind === 'video' || kind === 'audio') return <FileType className={className} />
  return <Paperclip className={className} />
}

export function CardAttachments({
  card,
  userId,
  attachments,
  onChange,
  logAct,
  onPreview,
  onImagePreview,
}: CardAttachmentsProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{
    name: string
    done: number
    total: number
    percent: number
  } | null>(null)

  // Drag and drop upload state
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false)
  const dragCounter = useRef(0)
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string | null>(null)

  // Virtual folders state
  const [folders, setFolders] = useState<VirtualFolder[]>(() => {
    try {
      if (Array.isArray(card.attachment_folders)) return card.attachment_folders
      if (typeof card.attachment_folders === 'string') return JSON.parse(card.attachment_folders)
    } catch {
      /* intentionally ignored */
    }
    return []
  })

  // Keep folders synchronized if card updates from outside
  useEffect(() => {
    try {
      const parsed = Array.isArray(card.attachment_folders)
        ? card.attachment_folders
        : typeof card.attachment_folders === 'string'
          ? JSON.parse(card.attachment_folders)
          : []
      setFolders(parsed)
    } catch (_) {
      setFolders([])
    }
  }, [card.attachment_folders])

  // Accordion collapsed/expanded state for folders: map folderId -> boolean (true = expanded)
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({})

  // Folder creation & editing
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editFolderName, setEditFolderName] = useState('')
  const [folderToDelete, setFolderToDelete] = useState<VirtualFolder | null>(null)

  // Attachment editing / deleting
  const [attachmentToDelete, setAttachmentToDelete] = useState<AttachmentRecord | null>(null)
  const [isDeletingAttachment, setIsDeletingAttachment] = useState(false)
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null)
  const [editingAttachmentName, setEditingAttachmentName] = useState('')
  const [isSavingAttachmentName, setIsSavingAttachmentName] = useState(false)

  // ZIP state
  const [isZipping, setIsZipping] = useState(false)
  const [zipProgressText, setZipProgressText] = useState('')

  // Drag and drop between folders (attachment re-location)
  const [draggedAttachmentId, setDraggedAttachmentId] = useState<string | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null | 'root'>(null)

  // Save folders to DB
  const saveFolders = async (updatedFolders: VirtualFolder[]) => {
    setFolders(updatedFolders)
    try {
      await pb.collection('cards').update(card.id, {
        attachment_folders: updatedFolders,
      })
      onChange()
    } catch (err) {
      console.error('Erro ao salvar pastas:', err)
      toast({
        title: 'Erro ao salvar organização das pastas',
        variant: 'destructive',
      })
    }
  }

  // --- FOLDER CRUD ---
  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim()
    if (!trimmed) {
      setIsCreatingFolder(false)
      return
    }
    const newFolder: VirtualFolder = {
      id: 'f_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      name: trimmed,
      created: new Date().toISOString(),
    }
    const next = [...folders, newFolder]
    await saveFolders(next)
    await logAct('edit_desc', `Criou a pasta de anexos "${trimmed}"`)
    setNewFolderName('')
    setIsCreatingFolder(false)
    setOpenFolders((prev) => ({ ...prev, [newFolder.id]: true }))
    toast({ title: 'Pasta criada com sucesso', description: trimmed })
  }

  const handleRenameFolder = async (folderId: string) => {
    const trimmed = editFolderName.trim()
    if (!trimmed) {
      setEditingFolderId(null)
      return
    }
    const target = folders.find((f) => f.id === folderId)
    if (!target || target.name === trimmed) {
      setEditingFolderId(null)
      return
    }
    const next = folders.map((f) => (f.id === folderId ? { ...f, name: trimmed } : f))
    await saveFolders(next)
    await logAct('edit_desc', `Renomeou a pasta "${target.name}" para "${trimmed}"`)
    setEditingFolderId(null)
    toast({ title: 'Pasta renomeada', description: trimmed })
  }

  const handleDeleteFolder = async () => {
    if (!folderToDelete) return
    const folderId = folderToDelete.id
    const folderName = folderToDelete.name

    // Unassign folder_id from all attachments in this folder
    const folderFiles = attachments.filter((a) => a.folder_id === folderId)
    for (const file of folderFiles) {
      try {
        await pb.collection('attachments').update(file.id, { folder_id: null })
      } catch (e) {
        console.error(`Erro ao desvincular anexo ${file.id} da pasta:`, e)
      }
    }

    const next = folders.filter((f) => f.id !== folderId)
    await saveFolders(next)
    await logAct('edit_desc', `Excluiu a pasta de anexos "${folderName}"`)
    setFolderToDelete(null)
    toast({
      title: 'Pasta excluída',
      description: `A pasta "${folderName}" foi removida e seus arquivos foram movidos para a raiz.`,
    })
  }

  const toggleFolderAccordion = (folderId: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [folderId]: prev[folderId] === undefined ? false : !prev[folderId],
    }))
  }

  // --- MOVE ATTACHMENT TO FOLDER ---
  const handleMoveAttachment = async (attachmentId: string, targetFolderId: string | null) => {
    try {
      const att = attachments.find((a) => a.id === attachmentId)
      if (!att) return
      if (att.folder_id === targetFolderId || (!att.folder_id && targetFolderId === null)) return

      await pb.collection('attachments').update(attachmentId, {
        folder_id: targetFolderId,
      })

      const targetFolderName = targetFolderId
        ? folders.find((f) => f.id === targetFolderId)?.name || 'Pasta'
        : 'Raiz'
      toast({
        title: 'Anexo movido',
        description: `"${att.name}" foi movido para ${targetFolderName}.`,
      })
      onChange()
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao mover anexo',
        variant: 'destructive',
      })
    } finally {
      setDraggedAttachmentId(null)
      setDragOverFolderId(null)
    }
  }

  // --- UPLOAD MULTIPLO & DRAG/DROP FILE UPLOAD ---
  const handleUploadFiles = async (files: File[], targetFolder: string | null = null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    let success = 0
    let failed = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const currentPercent = Math.round((i / files.length) * 100)
      setUploadProgress({
        name: file.name,
        done: i,
        total: files.length,
        percent: currentPercent,
      })

      try {
        const formData = new FormData()
        formData.append('card_id', card.id)
        formData.append('file', file)
        formData.append('name', file.name)
        formData.append('type', file.type || 'application/octet-stream')
        formData.append('size', file.size.toString())
        formData.append('user_id', userId)
        if (targetFolder) {
          formData.append('folder_id', targetFolder)
        }

        await pb.collection('attachments').create(formData)
        await logAct('attachment_add', `Anexou o arquivo ${file.name}`)
        success++

        if (files.length > 1) {
          toast({
            title: `Anexo enviado (${i + 1}/${files.length})`,
            description: file.name,
          })
        }
      } catch (err) {
        console.error('Upload error:', err)
        failed++
        toast({
          title: 'Erro ao enviar anexo',
          description: file.name,
          variant: 'destructive',
        })
      }
    }

    setUploadProgress({
      name: 'Concluído',
      done: files.length,
      total: files.length,
      percent: 100,
    })

    setTimeout(() => {
      setUploadProgress(null)
      setIsUploading(false)
    }, 500)

    if (files.length > 1) {
      toast({
        title: 'Envio concluído',
        description: `${success} arquivo(s) enviado(s)${failed ? `, ${failed} falhou/falharam` : ''}.`,
        variant: failed ? 'destructive' : 'default',
      })
    } else if (success && failed === 0) {
      toast({ title: 'Anexo enviado com sucesso', description: files[0].name })
    }

    onChange()
  }

  // File Input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length > 0) {
      handleUploadFiles(files, uploadTargetFolderId)
      setUploadTargetFolderId(null)
    }
  }

  // Drag over the whole attachments container for file uploads
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Check if dragging files from OS
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      dragCounter.current += 1
      setIsDraggingFileOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      dragCounter.current -= 1
      if (dragCounter.current <= 0) {
        dragCounter.current = 0
        setIsDraggingFileOver(false)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDrop = (e: React.DragEvent, targetFolderId: string | null = null) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDraggingFileOver(false)

    // Check if dropping an internal attachment item (reorganize between folders)
    const droppedAttId = e.dataTransfer.getData('text/plain') || draggedAttachmentId
    if (droppedAttId && !e.dataTransfer.files?.length) {
      handleMoveAttachment(droppedAttId, targetFolderId)
      return
    }

    // OS files dropped
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length > 0) {
      handleUploadFiles(files, targetFolderId)
    }
  }

  // --- ATTACHMENT ITEM CRUD ---
  const handleStartRename = (a: AttachmentRecord) => {
    setEditingAttachmentId(a.id)
    setEditingAttachmentName(a.name || '')
  }

  const handleSaveRename = async (a: AttachmentRecord) => {
    const trimmed = editingAttachmentName.trim()
    if (!trimmed) {
      toast({ title: 'O nome não pode estar vazio', variant: 'destructive' })
      setEditingAttachmentId(null)
      return
    }
    if (trimmed === a.name) {
      setEditingAttachmentId(null)
      return
    }
    setIsSavingAttachmentName(true)
    try {
      await pb.collection('attachments').update(a.id, { name: trimmed })
      await logAct('attachment_rename', `Renomeou o anexo de "${a.name}" para "${trimmed}"`)
      toast({ title: 'Anexo renomeado', description: trimmed })
      onChange()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao renomear anexo', variant: 'destructive' })
    } finally {
      setIsSavingAttachmentName(false)
      setEditingAttachmentId(null)
    }
  }

  const handleDeleteAttachment = async () => {
    if (!attachmentToDelete) return
    setIsDeletingAttachment(true)
    try {
      await pb.collection('attachments').delete(attachmentToDelete.id)
      await logAct('attachment_remove', `Removeu o anexo ${attachmentToDelete.name}`)
      toast({ title: 'Anexo excluído', description: attachmentToDelete.name })
      onChange()
    } catch (error) {
      console.error(error)
      toast({
        title: 'Erro ao excluir anexo',
        description: 'Não foi possível remover o arquivo.',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingAttachment(false)
      setAttachmentToDelete(null)
    }
  }

  // --- DOWNLOAD ALL IN ZIP (WITH FOLDER STRUCTURE) ---
  const handleDownloadAllZip = async () => {
    if (attachments.length === 0) {
      toast({
        title: 'Nenhum anexo',
        description: 'Não há arquivos para baixar neste cartão.',
      })
      return
    }

    setIsZipping(true)
    setZipProgressText('Iniciando compactação...')

    try {
      const zip = new JSZip()
      const folderMap = new Map<string, string>()
      folders.forEach((f) => folderMap.set(f.id, f.name.replace(/[\\/:*?"<>|]/g, '_')))

      let downloadedCount = 0

      // Helper to avoid name collision inside the same folder
      const usedPaths = new Set<string>()

      for (let i = 0; i < attachments.length; i++) {
        const att = attachments[i]
        setZipProgressText(`Baixando arquivo ${i + 1} de ${attachments.length}: ${att.name}`)

        const fileUrl = pb.files.getURL(att, att.file)
        const response = await fetch(fileUrl)
        if (!response.ok) {
          throw new Error(`Falha ao baixar ${att.name}`)
        }
        const blob = await response.blob()

        // Clean file name
        let safeFileName = (att.name || 'arquivo').replace(/[\\/:*?"<>|]/g, '_')
        const folderName = att.folder_id ? folderMap.get(att.folder_id) : null

        let fullPath = folderName ? `${folderName}/${safeFileName}` : safeFileName

        // Deduplicate path if same file name exists in same folder
        let counter = 1
        while (usedPaths.has(fullPath)) {
          const parts = safeFileName.split('.')
          let newName = ''
          if (parts.length > 1) {
            const ext = parts.pop()
            newName = `${parts.join('.')}_(${counter}).${ext}`
          } else {
            newName = `${safeFileName}_(${counter})`
          }
          fullPath = folderName ? `${folderName}/${newName}` : newName
          counter++
        }
        usedPaths.add(fullPath)

        zip.file(fullPath, blob)
        downloadedCount++
      }

      setZipProgressText('Gerando arquivo ZIP...')
      const zipContent = await zip.generateAsync(
        {
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          setZipProgressText(`Compactando: ${Math.round(metadata.percent)}%`)
        },
      )

      // Trigger download
      const cleanCardTitle = (card.title || 'cartao').replace(/[\\/:*?"<>|]/g, '_').substring(0, 40)
      const fileName = `anexos_${cleanCardTitle}.zip`
      const url = URL.createObjectURL(zipContent)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: 'Download concluído',
        description: `${downloadedCount} arquivo(s) compactado(s) em ${fileName}`,
      })
    } catch (err) {
      console.error('Erro ao gerar ZIP:', err)
      toast({
        title: 'Erro ao gerar ZIP',
        description: 'Ocorreu um erro ao baixar os arquivos compactados.',
        variant: 'destructive',
      })
    } finally {
      setIsZipping(false)
      setZipProgressText('')
    }
  }

  // Split attachments: in folders vs root (unassigned)
  const rootAttachments = attachments.filter(
    (a) => !a.folder_id || !folders.some((f) => f.id === a.folder_id),
  )

  // Render individual attachment card
  const renderAttachmentItem = (a: AttachmentRecord) => {
    const kind = getFileKind(a)
    const fileUrl = pb.files.getURL(a, a.file)
    const isEditingThis = editingAttachmentId === a.id
    const isDragged = draggedAttachmentId === a.id

    return (
      <div
        key={a.id}
        draggable
        onDragStart={(e) => {
          setDraggedAttachmentId(a.id)
          e.dataTransfer.setData('text/plain', a.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        onDragEnd={() => {
          setDraggedAttachmentId(null)
          setDragOverFolderId(null)
        }}
        className={cn(
          'flex flex-col border border-white/10 rounded-lg overflow-hidden group hover:border-emerald-500/50 shadow-sm transition-all hover:shadow-md bg-white/5 relative select-none',
          isDragged && 'opacity-40 scale-95 border-dashed border-emerald-500',
        )}
      >
        <div
          className="bg-black/20 h-28 flex items-center justify-center relative cursor-pointer overflow-hidden"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (kind === 'image') {
              onImagePreview(a)
            } else if (kind === 'pdf') {
              onPreview(a)
            } else {
              window.open(fileUrl, '_blank', 'noreferrer')
            }
          }}
        >
          {kind === 'image' ? (
            <img src={fileUrl} className="object-cover w-full h-full" alt={a.name} />
          ) : kind === 'pdf' ? (
            <div className="relative w-full h-full">
              <iframe
                src={fileUrl}
                title={a.name}
                className="w-full h-full pointer-events-none"
                style={{ border: 'none' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2">
                <span className="text-[10px] font-semibold text-white/90 flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 rounded px-1.5 py-0.5">
                  <FileText className="w-3 h-3" /> PDF
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-2">
              <FileIcon kind={kind} className="w-9 h-9 text-gray-300" />
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                {kind === 'doc'
                  ? 'Documento'
                  : kind === 'video'
                    ? 'Vídeo'
                    : kind === 'audio'
                      ? 'Áudio'
                      : 'Arquivo'}
              </span>
            </div>
          )}
        </div>

        {isEditingThis ? (
          <div className="p-2 border-t border-white/10 bg-white/5">
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                value={editingAttachmentName}
                onChange={(e) => setEditingAttachmentName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveRename(a)
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    setEditingAttachmentId(null)
                  }
                }}
                disabled={isSavingAttachmentName}
                className="h-7 text-xs bg-white/10 border-white/10 focus-visible:ring-emerald-500/50 px-1.5"
              />
              {isSavingAttachmentName ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-emerald-400 hover:text-emerald-300"
                  onClick={() => handleSaveRename(a)}
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}
            </div>
            <p className="text-[9px] text-gray-500 mt-1">Enter para salvar · Esc para cancelar</p>
          </div>
        ) : (
          <div className="p-2 text-xs truncate font-medium bg-transparent text-gray-100 border-t border-white/10 flex items-center justify-between gap-1">
            <span className="truncate flex-1" title={a.name}>
              {a.name}
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Move to folder quick menu */}
              {folders.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                      title="Mover para pasta"
                      aria-label="Mover anexo para pasta"
                    >
                      <MoveRight className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-zinc-950/95 backdrop-blur-xl border-white/10 min-w-44">
                    <DropdownMenuLabel className="text-[10px] text-gray-400 uppercase tracking-wider">
                      Mover para...
                    </DropdownMenuLabel>
                    {a.folder_id && (
                      <DropdownMenuItem
                        onClick={() => handleMoveAttachment(a.id, null)}
                        className="text-xs cursor-pointer focus:bg-white/10 text-gray-200"
                      >
                        <Folder className="w-3.5 h-3.5 mr-2 text-gray-400" />
                        Raiz (sem pasta)
                      </DropdownMenuItem>
                    )}
                    {folders.map((f) => (
                      <DropdownMenuItem
                        key={f.id}
                        disabled={a.folder_id === f.id}
                        onClick={() => handleMoveAttachment(a.id, f.id)}
                        className="text-xs cursor-pointer focus:bg-white/10 text-gray-200 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{f.name}</span>
                        </span>
                        {a.folder_id === f.id && (
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                title="Renomear anexo"
                aria-label={`Renomear anexo ${a.name}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleStartRename(a)
                }}
              >
                <Pencil className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-gray-400 hover:text-red-400 hover:bg-red-500/20 transition-all"
                title="Excluir anexo"
                aria-label={`Excluir anexo ${a.name}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setAttachmentToDelete(a)
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className="space-y-4 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, null)}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-100">Anexos</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-medium">
            {attachments.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download all as ZIP button */}
          {attachments.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={isZipping || isUploading}
              onClick={handleDownloadAllZip}
              className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-emerald-500/30 text-gray-300 hover:text-emerald-400 text-xs transition-all shadow-sm active:scale-95"
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-400" />
                  Compactando...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                  Baixar tudo (.zip)
                </>
              )}
            </Button>
          )}

          {/* New folder button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsCreatingFolder(true)
              setNewFolderName('')
            }}
            disabled={isCreatingFolder || isUploading}
            className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 text-xs transition-all"
          >
            <FolderPlus className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            Nova Pasta
          </Button>

          {/* Add attachment button */}
          <Button
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-300 text-xs"
            onClick={() => {
              setUploadTargetFolderId(null)
              fileInputRef.current?.click()
            }}
            disabled={isUploading || isZipping}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin text-emerald-400" />
                Enviando...
              </>
            ) : (
              <>
                <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                Adicionar Anexo
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Inline New Folder Form */}
      {isCreatingFolder && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-md animate-fade-in">
          <FolderPlus className="w-4 h-4 text-emerald-400 shrink-0" />
          <Input
            autoFocus
            placeholder="Nome da pasta (ex: Documentos, Contratos, Imagens)..."
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleCreateFolder()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setIsCreatingFolder(false)
              }
            }}
            className="h-8 text-xs bg-white/10 border-white/10 focus-visible:ring-emerald-500/50 flex-1 text-gray-100"
          />
          <Button
            size="sm"
            onClick={handleCreateFolder}
            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Criar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsCreatingFolder(false)}
            className="h-8 px-2 text-gray-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Upload Progress Bar */}
      {isUploading && uploadProgress && (
        <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 backdrop-blur-md animate-fade-in">
          <div className="flex items-center justify-between text-xs font-medium text-gray-200">
            <span className="flex items-center gap-2 truncate">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
              <span className="truncate">Enviando: {uploadProgress.name}</span>
            </span>
            <span className="text-emerald-400 shrink-0 font-bold ml-2">
              {uploadProgress.done + 1} de {uploadProgress.total}
            </span>
          </div>
          <Progress
            value={uploadProgress.percent}
            className="h-1.5 bg-white/10 [&>div]:bg-emerald-500 transition-all duration-300"
          />
        </div>
      )}

      {/* ZIP Progress Indicator */}
      {isZipping && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 backdrop-blur-md animate-fade-in">
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
          <span className="text-xs text-gray-200 font-medium">{zipProgressText}</span>
        </div>
      )}

      {/* OVERLAY DRAG & DROP ZONE (Appears when dragging files over) */}
      {isDraggingFileOver && (
        <div
          className="rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-950/40 backdrop-blur-md p-8 text-center flex flex-col items-center justify-center gap-2 transition-all animate-fade-in pointer-events-none"
          style={{ minHeight: '140px' }}
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 animate-bounce">
            <UploadCloud className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-emerald-200">
            Solte os arquivos para fazer upload
          </p>
          <p className="text-xs text-emerald-400/80">Upload múltiplo automático</p>
        </div>
      )}

      {/* FOLDERS LIST (Accordion) */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <span>Pastas ({folders.length})</span>
          </div>

          <div className="space-y-2">
            {folders.map((folder) => {
              const folderFiles = attachments.filter((a) => a.folder_id === folder.id)
              const isOpen = openFolders[folder.id] ?? true // default expanded
              const isRenaming = editingFolderId === folder.id
              const isTargetOfDrag = dragOverFolderId === folder.id

              return (
                <div
                  key={folder.id}
                  onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (
                      draggedAttachmentId ||
                      (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files'))
                    ) {
                      setDragOverFolderId(folder.id)
                    }
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (dragOverFolderId === folder.id) {
                      setDragOverFolderId(null)
                    }
                  }}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  className={cn(
                    'rounded-lg border transition-all duration-200 bg-white/5 overflow-hidden',
                    isTargetOfDrag
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'border-white/10 hover:border-white/20',
                  )}
                >
                  {/* Folder Header */}
                  <div
                    onClick={() => toggleFolderAccordion(folder.id)}
                    className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-white/5 select-none transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button
                        type="button"
                        className="text-gray-400 hover:text-white p-0.5"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFolderAccordion(folder.id)
                        }}
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {isOpen ? (
                        <FolderOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}

                      {isRenaming ? (
                        <div
                          className="flex items-center gap-1 flex-1 max-w-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Input
                            autoFocus
                            value={editFolderName}
                            onChange={(e) => setEditFolderName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleRenameFolder(folder.id)
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                setEditingFolderId(null)
                              }
                            }}
                            className="h-6 text-xs bg-white/10 border-white/10 focus-visible:ring-emerald-500/50 px-1.5"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-emerald-400 hover:text-emerald-300"
                            onClick={() => handleRenameFolder(folder.id)}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-gray-400 hover:text-white"
                            onClick={() => setEditingFolderId(null)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-semibold text-gray-200 truncate">
                            {folder.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-gray-400 font-medium">
                            {folderFiles.length}
                          </span>
                        </div>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Upload directly to this folder */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                        title={`Enviar arquivos para "${folder.name}"`}
                        aria-label={`Enviar arquivos para ${folder.name}`}
                        onClick={() => {
                          setUploadTargetFolderId(folder.id)
                          fileInputRef.current?.click()
                        }}
                      >
                        <Paperclip className="w-3 h-3" />
                      </Button>

                      {/* Rename folder button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                        title="Renomear pasta"
                        aria-label={`Renomear pasta ${folder.name}`}
                        onClick={() => {
                          setEditingFolderId(folder.id)
                          setEditFolderName(folder.name)
                        }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>

                      {/* Delete folder button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-400 hover:text-red-400 hover:bg-red-500/20"
                        title="Excluir pasta"
                        aria-label={`Excluir pasta ${folder.name}`}
                        onClick={() => setFolderToDelete(folder)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Folder Contents (Accordion Body) */}
                  {isOpen && (
                    <div className="p-3 pt-1 border-t border-white/5 bg-black/10">
                      {folderFiles.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {folderFiles.map(renderAttachmentItem)}
                        </div>
                      ) : (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault()
                            setDragOverFolderId(folder.id)
                          }}
                          onDrop={(e) => handleDrop(e, folder.id)}
                          className={cn(
                            'p-4 text-center rounded border border-dashed text-xs transition-colors',
                            isTargetOfDrag
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                              : 'border-white/10 text-gray-500 bg-white/5 hover:border-white/20',
                          )}
                        >
                          Pasta vazia. Arraste arquivos aqui ou clique no clipe acima para enviar.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ROOT / GENERAL ATTACHMENTS (Files not in any folder) */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (draggedAttachmentId) setDragOverFolderId('root')
        }}
        onDragLeave={() => {
          if (dragOverFolderId === 'root') setDragOverFolderId(null)
        }}
        onDrop={(e) => handleDrop(e, null)}
        className={cn(
          'space-y-3 transition-colors rounded-lg',
          dragOverFolderId === 'root' &&
            'p-2 border-2 border-dashed border-emerald-500 bg-emerald-500/5',
        )}
      >
        {folders.length > 0 && rootAttachments.length > 0 && (
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">
            <span>Arquivos na raiz ({rootAttachments.length})</span>
          </div>
        )}

        {attachments.length > 0 ? (
          rootAttachments.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {rootAttachments.map(renderAttachmentItem)}
            </div>
          ) : folders.length === 0 ? (
            <div className="text-sm text-gray-400 border-2 border-dashed border-white/10 bg-white/5 p-6 text-center rounded-lg">
              Nenhum anexo na raiz.
            </div>
          ) : null
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer group text-sm text-gray-400 border-2 border-dashed border-white/10 hover:border-emerald-500/40 bg-white/5 hover:bg-white/10 p-8 text-center rounded-lg transition-all"
          >
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white/5 group-hover:bg-emerald-500/10 flex items-center justify-center text-gray-400 group-hover:text-emerald-400 transition-colors">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="font-medium text-gray-300 group-hover:text-white transition-colors">
              Nenhum anexo neste cartão.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Arraste e solte arquivos aqui ou clique para selecionar
            </p>
          </div>
        )}
      </div>

      {/* Delete Folder Dialog */}
      <AlertDialog
        open={!!folderToDelete}
        onOpenChange={(open) => {
          if (!open) setFolderToDelete(null)
        }}
      >
        <AlertDialogContent className="max-w-sm bg-zinc-950/90 backdrop-blur-2xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gray-100">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/15 border border-red-500/25">
                <Trash2 className="w-4 h-4 text-red-400" />
              </span>
              Excluir pasta
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir a pasta{' '}
              <span className="font-semibold text-gray-200">{folderToDelete?.name}</span>? Os
              arquivos contidos nela serão mantidos e movidos para a raiz do cartão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 hover:bg-white/10 text-gray-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteFolder()
              }}
              className="bg-red-500/90 hover:bg-red-500 text-white border border-red-500/40"
            >
              Excluir Pasta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Attachment Dialog */}
      <AlertDialog
        open={!!attachmentToDelete}
        onOpenChange={(open) => {
          if (!isDeletingAttachment && !open) setAttachmentToDelete(null)
        }}
      >
        <AlertDialogContent className="max-w-sm bg-zinc-950/90 backdrop-blur-2xl border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-gray-100">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/15 border border-red-500/25">
                <Trash2 className="w-4 h-4 text-red-400" />
              </span>
              Excluir anexo
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Tem certeza que deseja excluir o anexo{' '}
              <span className="font-semibold text-gray-200 break-all">
                {attachmentToDelete?.name}
              </span>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingAttachment}
              className="bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingAttachment}
              onClick={(e) => {
                e.preventDefault()
                handleDeleteAttachment()
              }}
              className="bg-red-500/90 hover:bg-red-500 text-white border border-red-500/40"
            >
              {isDeletingAttachment ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
