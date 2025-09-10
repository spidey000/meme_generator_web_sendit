import React, { useRef, useEffect, useState } from 'react';
import { StickerLayerProps } from '../types';
import { StickerEffectManager } from '../utils/effectRenderer';

interface CanvasEffectRendererProps {
  layer: StickerLayerProps;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}

const CanvasEffectRenderer: React.FC<CanvasEffectRendererProps> = ({
  layer,
  width,
  height,
  className = '',
  style = {}
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const effectManagerRef = useRef<StickerEffectManager | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Lazy initialization of effect manager
  useEffect(() => {
    if (!effectManagerRef.current) {
      effectManagerRef.current = new StickerEffectManager();
    }
    setIsInitialized(true);
  }, []);

  // Load image when component mounts or layer src changes
  useEffect(() => {
    if (!layer.src || !isInitialized) return;

    const loadImage = async () => {
      try {
        setError(null);
        const result = await StickerEffectManager.loadImage(layer.src);
        
        if (result.loaded) {
          imageRef.current = result.image;
          setImageLoaded(true);
        } else {
          setError(result.error || 'Failed to load image');
          setImageLoaded(false);
        }
      } catch (err) {
        setError('Image loading failed');
        setImageLoaded(false);
      }
    };

    loadImage();
  }, [layer.src, isInitialized]);

  // Render canvas when image is loaded or effects change
  useEffect(() => {
    if (!canvasRef.current || !imageLoaded || !imageRef.current || !effectManagerRef.current) {
      return;
    }

    const renderCanvas = async () => {
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          setError('Canvas context not available');
          return;
        }

        // Set canvas size with device pixel ratio for sharp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Scale context for high DPI displays
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Save context state
        ctx.save();

        // Apply layer transformations
        ctx.translate(width / 2, height / 2);
        ctx.rotate((layer.rotation || 0) * Math.PI / 180);
        ctx.translate(-width / 2, -height / 2);

        // Render effects
        await effectManagerRef.current.renderToCanvas(ctx, layer, imageRef.current!);

        // Restore context state
        ctx.restore();

      } catch (err) {
        setError('Canvas rendering failed');
        console.error('Canvas rendering error:', err);
      }
    };

    renderCanvas();
  }, [layer, width, height, imageLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (effectManagerRef.current) {
        effectManagerRef.current.cleanup();
      }
    };
  }, []);

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
        pointerEvents: 'none' // Don't interfere with mouse events
      }}
      data-layer-id={layer.id}
    />
  );
};

export default CanvasEffectRenderer;