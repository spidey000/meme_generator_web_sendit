import React, { useRef, useEffect, useState } from 'react';
import { StickerLayerProps } from '../types';
import { StickerEffectManager } from '../utils/effectRenderer';
import { getRenderContextForCanvas, drawStickerLayer } from '../utils/renderPipeline';

interface CanvasEffectRendererProps {
  layer: StickerLayerProps;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
  scale?: number; // default devicePixelRatio
}

const CanvasEffectRenderer: React.FC<CanvasEffectRendererProps> = ({
  layer,
  width,
  height,
  className = '',
  style = {},
  scale,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Init
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Load image when component mounts or layer src changes
  useEffect(() => {
    if (!layer.src || !isInitialized) return;

    let cancelled = false;
    const loadImage = async () => {
      try {
        setError(null);
        const result = await StickerEffectManager.loadImage(layer.src);
        if (cancelled) return;
        if (result.loaded) {
          imageRef.current = result.image;
          setImageLoaded(true);
        } else {
          setError(result.error || 'Failed to load image');
          setImageLoaded(false);
        }
      } catch {
        if (!cancelled) {
          setError('Image loading failed');
          setImageLoaded(false);
        }
      }
    };

    loadImage();
    return () => {
      cancelled = true;
    };
  }, [layer.src, isInitialized]);

  // Render canvas when image is loaded or effects/layer change
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded || !imageRef.current) return;

    const canvas = canvasRef.current;
    const effectiveScale = scale ?? (window.devicePixelRatio || 1);

    const { ctx } = getRenderContextForCanvas(canvas, width, height, effectiveScale);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw sticker with effects via shared pipeline
    // Important: zero out global transforms for preview-only rendering,
    // since the DOM container already applies left/top + rotation.
    const localLayer = { ...layer, x: 0, y: 0, rotation: 0 };
    drawStickerLayer(ctx, localLayer, imageRef.current, effectiveScale)
      .catch(err => {
        setError('Canvas rendering failed');
        console.error('Canvas rendering error:', err);
      });
  }, [layer, width, height, imageLoaded, scale]);

  if (error) {
    return (
      <div
        className={`canvas-effect-error ${className}`}
        style={{
          ...style,
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ff6b6b',
          color: 'white',
          fontSize: '12px',
          textAlign: 'center',
          padding: '8px',
          boxSizing: 'border-box'
        }}
      >
        <span>⚠️ {error}</span>
      </div>
    );
  }

  if (!imageLoaded) {
    return (
      <div
        className={`canvas-effect-loading ${className}`}
        style={{
          ...style,
          width: `${width}px`,
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          color: '#666',
          fontSize: '12px'
        }}
      >
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`canvas-effect-renderer ${className}`}
      style={{
        ...style,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none'
      }}
      data-layer-id={layer.id}
    />
  );
};

export default CanvasEffectRenderer;