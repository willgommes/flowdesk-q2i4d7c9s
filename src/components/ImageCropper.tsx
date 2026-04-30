import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { ZoomIn, ZoomOut } from 'lucide-react'

interface Point {
  x: number
  y: number
}

export function ImageCropper({
  imageUrl,
  onCrop,
  onCancel,
}: {
  imageUrl: string
  onCrop: (file: File) => void
  onCancel: () => void
}) {
  const [zoom, setZoom] = useState(1)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<Point>({ x: 0, y: 0 })
  const imageRef = useRef<HTMLImageElement>(null)

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true)
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    dragStart.current = { x: clientX - crop.x, y: clientY - crop.y }
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY
      setCrop({
        x: clientX - dragStart.current.x,
        y: clientY - dragStart.current.y,
      })
    },
    [isDragging],
  )

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      window.addEventListener('touchmove', handleMouseMove, { passive: false })
      window.addEventListener('touchend', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('touchmove', handleMouseMove)
      window.removeEventListener('touchend', handleMouseUp)
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  const generateCrop = () => {
    const image = imageRef.current
    if (!image) return
    const canvas = document.createElement('canvas')
    const size = 256
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)

    const centerX = size / 2
    const centerY = size / 2

    ctx.translate(centerX, centerY)
    ctx.scale(zoom, zoom)
    ctx.translate(crop.x / zoom, crop.y / zoom)
    ctx.translate(-centerX, -centerY)

    const ratio = Math.max(size / image.naturalWidth, size / image.naturalHeight)
    const renderWidth = image.naturalWidth * ratio
    const renderHeight = image.naturalHeight * ratio
    const offsetX = (size - renderWidth) / 2
    const offsetY = (size - renderHeight) / 2

    ctx.drawImage(image, offsetX, offsetY, renderWidth, renderHeight)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
          onCrop(file)
        }
      },
      'image/jpeg',
      0.9,
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full items-center">
      <div
        className="relative w-64 h-64 overflow-hidden bg-muted rounded-full cursor-move shadow-inner"
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Crop preview"
          className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
          style={{
            transform: `scale(${zoom}) translate(${crop.x / zoom}px, ${crop.y / zoom}px)`,
            transformOrigin: 'center',
          }}
        />
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full pointer-events-none"></div>
      </div>

      <div className="flex items-center gap-4 w-full max-w-[256px]">
        <ZoomOut className="w-4 h-4 text-muted-foreground" />
        <Slider
          value={[zoom]}
          min={1}
          max={3}
          step={0.1}
          onValueChange={(v) => setZoom(v[0])}
          className="flex-1"
        />
        <ZoomIn className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="flex justify-end gap-2 w-full mt-2">
        <Button variant="outline" onClick={onCancel} type="button">
          Cancelar
        </Button>
        <Button onClick={generateCrop} type="button">
          Aplicar
        </Button>
      </div>
    </div>
  )
}
