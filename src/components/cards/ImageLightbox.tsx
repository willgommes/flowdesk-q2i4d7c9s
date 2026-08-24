import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

interface ImageLightboxProps {
  images: any[]
  startIndex: number
  onClose: () => void
}

const MIN_ZOOM = 1
const MAX_ZOOM = 5

const getDistance = (
  t1: { clientX: number; clientY: number },
  t2: { clientX: number; clientY: number },
) => {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.hypot(dx, dy)
}

export function ImageLightbox({ images, startIndex, onClose }: ImageLightboxProps) {
  const [index, setIndex] = useState(startIndex)
  const [zoom, setZoom] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null)

  const current = images[index]
  const hasMultiple = images.length > 1

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length)
    setZoom(1)
  }, [images.length])

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length)
    setZoom(1)
  }, [images.length])

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

  // Keyboard navigation: Esc, ←, →
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goNext, goPrev, onClose])

  // Wheel zoom + pinch zoom via non-passive native listeners so we can preventDefault
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setZoom((z) => {
        const delta = -e.deltaY * 0.0015
        return clampZoom(z + delta * z)
      })
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault()
        e.stopPropagation()
        const dist = getDistance(e.touches[0], e.touches[1])
        const ratio = dist / pinchRef.current.distance
        setZoom(clampZoom(pinchRef.current.zoom * ratio))
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        distance: getDistance(e.touches[0], e.touches[1]),
        zoom,
      }
    }
  }

  const handleTouchEnd = () => {
    pinchRef.current = null
  }

  const zoomIn = () => setZoom((z) => clampZoom(z + 0.25))
  const zoomOut = () => setZoom((z) => clampZoom(z - 0.25))
  const resetZoom = () => setZoom(1)

  const zoomPct = Math.round(zoom * 100)

  if (!current) return null

  const content = (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 sm:p-8 select-none touch-none overflow-hidden"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
      aria-label="Visualização de imagem em tela cheia"
    >
      {/* Top bar: Controls */}
      <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="text-xs font-semibold text-gray-200 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-3 py-1.5 max-w-[200px] sm:max-w-xs md:max-w-md truncate shadow-lg">
            {current.name || 'Imagem'}
          </span>
          {hasMultiple && (
            <span className="text-xs font-medium text-gray-300 bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1.5 tabular-nums shadow-lg">
              {index + 1} / {images.length}
            </span>
          )}
        </div>

        {/* Zoom controls */}
        <div className="pointer-events-auto flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-lg">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              zoomOut()
            }}
            disabled={zoom <= MIN_ZOOM}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-200 hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-200 transition-all cursor-pointer"
            aria-label="Reduzir zoom"
            title="Reduzir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              resetZoom()
            }}
            className="px-2 text-center text-xs font-medium text-gray-200 hover:text-emerald-400 tabular-nums transition-colors cursor-pointer"
            title="Restaurar zoom (100%)"
          >
            {zoomPct}%
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              zoomIn()
            }}
            disabled={zoom >= MAX_ZOOM}
            className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-200 hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-200 transition-all cursor-pointer"
            aria-label="Aumentar zoom"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoom !== 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                resetZoom()
              }}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-200 hover:bg-white/15 hover:text-white transition-all cursor-pointer"
              aria-label="Redefinir tamanho"
              title="Redefinir tamanho"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Actions (Close & Download) */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <a
            href={pb.files.getURL(current, current.file)}
            download={current.name || 'imagem'}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-gray-200 hover:text-emerald-400 bg-black/60 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 rounded-full px-3 py-2 backdrop-blur-md transition-all shadow-lg cursor-pointer"
            title="Baixar imagem"
          >
            <Download className="w-4 h-4" />
            Baixar
          </a>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-black/60 hover:bg-white/20 border border-white/10 hover:border-white/20 text-gray-200 hover:text-white backdrop-blur-md transition-all shadow-lg cursor-pointer active:scale-95"
            aria-label="Fechar visualização"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/60 hover:bg-white/20 border border-white/10 hover:border-white/20 text-gray-200 hover:text-white backdrop-blur-md transition-all active:scale-95 shadow-xl cursor-pointer"
            aria-label="Imagem anterior"
            title="Anterior (←)"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 inline-flex items-center justify-center w-12 h-12 rounded-full bg-black/60 hover:bg-white/20 border border-white/10 hover:border-white/20 text-gray-200 hover:text-white backdrop-blur-md transition-all active:scale-95 shadow-xl cursor-pointer"
            aria-label="Próxima imagem"
            title="Próxima (→)"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </>
      )}

      {/* Bottom mobile download button */}
      <div className="sm:hidden absolute bottom-4 right-4 z-30">
        <a
          href={pb.files.getURL(current, current.file)}
          download={current.name || 'imagem'}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-200 hover:text-emerald-400 bg-black/60 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 rounded-full px-3.5 py-2 backdrop-blur-md transition-all shadow-lg cursor-pointer"
          title="Baixar imagem"
        >
          <Download className="w-4 h-4" />
          Baixar
        </a>
      </div>

      {/* Center Image Container */}
      <div className="w-full h-full flex items-center justify-center p-4 sm:p-12">
        <img
          key={current.id || current.file}
          src={pb.files.getURL(current, current.file)}
          alt={current.name || 'Imagem'}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation()
            setZoom((z) => (z > 1 ? 1 : 2))
          }}
          draggable={false}
          className="max-w-[90vw] max-h-[82vh] w-auto h-auto object-contain rounded-lg shadow-2xl border border-white/10 select-none transition-transform duration-150 ease-out cursor-zoom-in"
          style={{ transform: `scale(${zoom})` }}
        />
      </div>
    </div>
  )

  if (typeof document === 'undefined') {
    return content
  }

  return createPortal(content, document.body)
}
