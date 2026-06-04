import { useState, useEffect, useRef } from 'react';

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio: number; // width / height
  circular?: boolean;
  onCrop: (croppedBase64: string) => void;
  onClose: () => void;
}

export default function ImageCropper({ imageSrc, aspectRatio, circular, onCrop, onClose }: ImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleCrop = () => {
    const img = imageRef.current;
    if (!img) return;

    const canvas = document.createElement('canvas');
    let targetWidth = 800;
    let targetHeight = 800 / aspectRatio;
    if (aspectRatio === 3) {
      targetWidth = 1200;
      targetHeight = 400;
    } else if (aspectRatio === 1) {
      targetWidth = 400;
      targetHeight = 400;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    
    const viewWidth = 260;
    const viewHeight = 260 / aspectRatio;

    const viewX = (containerRect.width - viewWidth) / 2;
    const viewY = (280 - viewHeight) / 2;

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const scaleW = containerRect.width / imgWidth;
    const scaleH = 280 / imgHeight;
    const fitScale = Math.min(scaleW, scaleH);

    const baseWidth = imgWidth * fitScale;
    const baseHeight = imgHeight * fitScale;

    const imgLeft = (containerRect.width - baseWidth * zoom) / 2 + pan.x;
    const imgTop = (280 - baseHeight * zoom) / 2 + pan.y;

    const offsetOnImageX = (viewX - imgLeft) / (fitScale * zoom);
    const offsetOnImageY = (viewY - imgTop) / (fitScale * zoom);

    const sWidth = viewWidth / (fitScale * zoom);
    const sHeight = viewHeight / (fitScale * zoom);

    ctx.drawImage(
      img,
      offsetOnImageX,
      offsetOnImageY,
      sWidth,
      sHeight,
      0,
      0,
      targetWidth,
      targetHeight
    );

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
    onCrop(croppedBase64);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: 'var(--tg-secondary-bg)', borderRadius: '16px',
        width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column',
        overflow: 'hidden', border: '1px solid var(--tg-border)'
      }}>
        <div style={{
          padding: '16px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', borderBottom: '1px solid var(--tg-border)'
        }}>
          <span style={{ fontWeight: 700, color: 'var(--tg-text)' }}>Обрезка фото</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--tg-hint)',
            fontSize: '18px', cursor: 'pointer'
          }}>✕</button>
        </div>

        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          style={{
            height: '280px', position: 'relative', overflow: 'hidden',
            background: '#0a0e12', cursor: 'move', userSelect: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt="To crop"
            draggable={false}
            style={{
              pointerEvents: 'none',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              maxHeight: '100%', maxWidth: '100%',
              objectFit: 'contain',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          />

          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <div style={{
              width: '260px',
              height: `${260 / aspectRatio}px`,
              borderRadius: circular ? '50%' : '8px',
              border: '2px solid var(--tg-accent)',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            }} />
          </div>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--tg-hint)' }}>
            <span>Масштаб</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--tg-accent)' }}
          />
        </div>

        <div style={{ padding: '16px', display: 'flex', gap: '12px', borderTop: '1px solid var(--tg-border)' }}>
          <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Отмена</button>
          <button className="btn-primary" onClick={handleCrop} style={{ flex: 1 }}>Обрезать</button>
        </div>
      </div>
    </div>
  );
}
