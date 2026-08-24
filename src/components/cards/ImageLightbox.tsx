import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
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

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in p-4 overflow-hidden"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      role="dialog"
      aria-modal="true"
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
        className="absolute top-4 right-4 z-20 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 text-gray-200 hover:text-white backdrop-blur-md transition-all"
        aria-label="Fechar visualização"
        title="Fechar (Esc)"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Navigation arrows (glassmorphism / Dark Elegance) */}
      {hasMultiple && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goPrev()
            }}
            className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 text-gray-200 hover:text-white backdrop-blur-md transition-all active:scale-95"
            aria-label="Imagem anterior"
            title="Anterior (←)"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              goNext()
            }}
            className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 text-gray-200 hover:text-white backdrop-blur-md transition-all active:scale-95"
            aria-label="Próxima imagem"
            title="Próxima (→)"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Zoom controls */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-1.5 py-1">
        <button
          onClick={(e) => {
            e.stopPropagation()
            zoomOut()
          }}
          disabled={zoom <= MIN_ZOOM}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-200 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          aria-label="Reduzir zoom"
          title="Reduzir zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            resetZoom()
          }}
          className="min-w-[3rem] text-center text-xs font-medium text-gray-200 hover:text-white tabular-nums transition-colors"
          title="Restaurar zoom (100%)"
        >
          {zoomPct}%
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            zoomIn()
          }}
          disabled={zoom >= MAX_ZOOM}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full text-gray-200 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
          aria-label="Aumentar zoom"
          title="Aumentar zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      {/* Download button */}
      <a
        href={pb.files.getURL(current, current.file)}
        download={current.name || 'imagem'}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-4 right-4 z-20 inline-flex items-center gap-1.5 text-xs font-medium text-gray-200 hover:text-emerald-400 bg-white/10 hover:bg-emerald-500/10 border border-white/10 hover:border-emerald-500/30 rounded-md px-3 py-2 backdrop-blur-md transition-all"
        title="Baixar imagem"
      >
        <Download className="w-4 h-4" />
        Baixar
      </a>

      {/* Filename + counter */}
      <div className="absolute bottom-4 left-4 z-20 max-w-[60%] flex flex-col gap-1.5">
        <span className="inline-block text-xs font-medium text-gray-200 bg-black/40 backdrop-blur-md border border-white/10 rounded-md px-3 py-1.5 truncate w-fit max-w-full">
          {current.name}
        </span>
        {hasMultiple && (
          <span className="inline-block text-[10px] font-medium text-gray-300 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2 py-0.5 w-fit tabular-nums">
            {index + 1} / {images.length}
          </span>
        )}
      </div>

      {/* Image */}
      <img
        src={pb.files.getURL(current, current.file)}
        alt={current.name}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation()
          setZoom((z) => (z > 1 ? 1 : 2))
        }}
        draggable={false}
        className="max-w-[92vw] max-h-[85vh] object-contain rounded-lg shadow-2xl border border-white/10 select-none transition-transform duration-150 ease-out"
        style={{ transform: `scale(${zoom})` }}
      />
    </div>
  )
}
