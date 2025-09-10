import React, { useEffect, useRef } from 'react';
import { TextLayerProps } from '../types';
import { getRenderContextForCanvas, drawTextLayer } from '../utils/renderPipeline';

interface TextCanvasPreviewProps {
  layer: TextLayerProps;
  width: number;
  height: number;
  scale?: number; // default devicePixelRatio
  className?: string;
  style?: React.CSSProperties;
}

const TextCanvasPreview: React.FC<TextCanvasPreviewProps> = ({
  layer,
  width,
  height,
  scale,
  className = '',
  style = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const effectiveScale = scale ?? (window.devicePixelRatio || 1);
    const { ctx } = getRenderContextForCanvas(canvas, width, height, effectiveScale);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw text via shared pipeline (scale-aware)
    // Important: zero out global transforms for preview-only rendering,
    // since the DOM container already applies left/top + rotation.
    const localLayer: TextLayerProps = { ...layer, x: 0, y: 0, rotation: 0 };
    drawTextLayer(ctx, localLayer, effectiveScale).catch((err) => {
      // eslint-disable-next-line no-console
      console.error('Text canvas rendering failed', err);
    });
  }, [layer, width, height, scale]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        ...style,
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
      }}
      data-layer-id={layer.id}
    />
  );
};

export default TextCanvasPreview;