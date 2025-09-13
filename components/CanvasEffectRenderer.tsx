import React, { useRef, useEffect, useState } from 'react';
import { StickerLayerProps } from '../types';
import { StickerEffectManager } from '../utils/effectRenderer';
import { getRenderContextForCanvas, drawStickerLayer } from '../utils/renderPipeline';

/**
 * Compute extra visual padding (in CSS pixels) required for a sticker preview canvas
 * so effects (outline/shadow/glow) are not clipped by the layer box.
 * Stickers intentionally bypass clipping; we enlarge the canvas and offset it.
 */
function computeStickerPaddingCss(layer: StickerLayerProps): number {
  const outline = layer.outlineWidth || 0;
  const shadow = (layer.shadowBlur || 0) + Math.max(Math.abs(layer.shadowOffsetX || 0), Math.abs(layer.shadowOffsetY || 0));
  const glow = layer.glowStrength || 0;
  // Choose the dominant effect radius and add a small safety margin
  const maxRadius = Math.max(outline, shadow, glow);
  return Math.ceil(maxRadius > 0 ? maxRadius * 1.1 : 0);
}

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

  // Precompute CSS-space padding for this layer so the canvas can visually extend beyond the layer box.
  // This ensures stickers render beyond the template bounding box without being clipped locally.
  const padCss = computeStickerPaddingCss(layer);
  const cssWidth = width + 2 * padCss;
  const cssHeight = height + 2 * padCss;

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

    // Use expanded canvas size (CSS px), actual backing store is handled by getRenderContextForCanvas
    const expandedWidth = width + 2 * padCss;
    const expandedHeight = height + 2 * padCss;

    const { ctx } = getRenderContextForCanvas(canvas, expandedWidth, expandedHeight, effectiveScale);

    // Clear expanded area
    ctx.clearRect(0, 0, expandedWidth, expandedHeight);

    // Offset drawing by pad so content remains centered relative to original layer box
    ctx.save();
    ctx.translate(padCss, padCss);

    // Draw sticker with effects via shared pipeline
    // Important: zero out global transforms for preview-only rendering,
    // since the DOM container already applies left/top + rotation.
    const localLayer = { ...layer, x: 0, y: 0, rotation: 0 };
    drawStickerLayer(ctx, localLayer, imageRef.current, effectiveScale)
      .catch(err => {
        setError('Canvas rendering failed');
        console.error('Canvas rendering error:', err);
      })
      .finally(() => {
        ctx.restore();
      });
  }, [layer, width, height, imageLoaded, scale, padCss]);

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
        // Enlarge CSS box so effect pixels outside the layer area are visible.
        // Then offset it back by -pad to visually align with the layer box.
        width: `${cssWidth}px`,
        height: `${cssHeight}px`,
        position: 'relative',
        left: `-${padCss}px`,
        top: `-${padCss}px`,
        pointerEvents: 'none'
      }}
      data-layer-id={layer.id}
    />
  );
};

export default CanvasEffectRenderer;