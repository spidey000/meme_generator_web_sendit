import { Layer, LayerType, TextLayerProps, StickerLayerProps } from '../types';
import { renderStickerEffects, StickerEffectManager } from './effectRenderer';

export type RenderScale = { scale: number };
export type RenderSize = { width: number; height: number };

export function getRenderContextForCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  scale: number
): { ctx: CanvasRenderingContext2D; scale: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }
  canvas.width = Math.max(1, Math.floor(width * scale));
  canvas.height = Math.max(1, Math.floor(height * scale));
  // setTransform is preferred over scale to keep state consistent
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  return { ctx, scale };
}

export async function drawMeme(
  ctx: CanvasRenderingContext2D,
  params: {
    baseImage?: HTMLImageElement | HTMLCanvasElement | null;
    layers: Layer[];
    width: number;
    height: number;
    scale: number;
    /**
     * Optional draw offset to allow content (e.g., stickers) outside the original
     * template bounds to be included in export without clipping.
     * When provided, all drawing will be translated by (-offsetX, -offsetY).
     */
    offsetX?: number;
    offsetY?: number;
  }
): Promise<void> {
  const { baseImage, layers, width, height, scale, offsetX = 0, offsetY = 0 } = params;

  // Clear target surface
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.restore();

  // Apply global translation so that negative-layer coordinates become visible
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (offsetX !== 0 || offsetY !== 0) {
    ctx.translate(-offsetX, -offsetY);
  }

  // Base image (drawn at 0,0 in translated space)
  if (baseImage) {
    ctx.drawImage(baseImage, 0, 0, width, height);
  }

  // Draw layers in z-order
  const sorted = [...layers].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  for (const layer of sorted) {
    if (layer.type === LayerType.TEXT) {
      await drawTextLayer(ctx, layer as TextLayerProps, scale);
    } else if (layer.type === LayerType.STICKER) {
      const sticker = layer as StickerLayerProps;
      if (!sticker.src) continue;
      const res = await StickerEffectManager.loadImage(sticker.src);
      if (!res.loaded) continue;
      await drawStickerLayer(ctx, sticker, res.image, scale);
    }
  }

  // Restore after translated drawing
  ctx.restore();
}

/**
 * Draw a text layer using Canvas 2D only.
 * Implements outline, shadow, glow with scale-aware magnitudes.
 */
export async function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayerProps,
  scale: number
): Promise<void> {
  const {
    x,
    y,
    width = 0,
    height = 0,
    rotation = 0,
    text,
    fontFamily,
    fontSize,
    color,
    outlineColor,
    outlineWidth,
    shadowColor,
    shadowBlur,
    shadowOffsetX,
    shadowOffsetY,
    glowColor,
    glowStrength,
  } = layer;

  ctx.save();

  // Transform around layer center
  const cx = (x || 0) + width / 2;
  const cy = (y || 0) + height / 2;
  ctx.translate(cx, cy);
  ctx.rotate((rotation || 0) * Math.PI / 180);
  ctx.translate(-width / 2, -height / 2);

  // Font and alignment
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;

  // Outline first
  if (outlineWidth && outlineWidth > 0 && outlineColor) {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 3;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = (outlineWidth * 2) * scale;
    ctx.strokeText(text, width / 2, height / 2);
  }

  // Shadow
  if (shadowBlur && shadowBlur > 0 && shadowColor) {
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur * scale;
    ctx.shadowOffsetX = (shadowOffsetX || 0) * scale;
    ctx.shadowOffsetY = (shadowOffsetY || 0) * scale;
  }

  // Glow (separate from shadow): layered passes with increased blur
  if (glowStrength && glowStrength > 0 && glowColor) {
    const glowLayers = [
      { blur: glowStrength * 0.5 * scale, alpha: 0.6 },
      { blur: glowStrength * 1.0 * scale, alpha: 0.4 },
      { blur: glowStrength * 1.5 * scale, alpha: 0.2 },
    ];
    for (const gl of glowLayers) {
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = gl.blur;
      ctx.globalAlpha = gl.alpha;
      ctx.fillText(text, width / 2, height / 2);
      ctx.restore();
    }
    // reset shadow/glow state
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Main fill
  ctx.fillText(text, width / 2, height / 2);

  // Restore
  ctx.restore();
}

/**
 * Draw a sticker layer using Canvas only, scale-aware.
 * Requires the already loaded image.
 */
export async function drawStickerLayer(
  ctx: CanvasRenderingContext2D,
  layer: StickerLayerProps,
  image: HTMLImageElement | HTMLCanvasElement,
  scale: number
): Promise<void> {
  const {
    x,
    y,
    width = 0,
    height = 0,
    rotation = 0,
    outlineColor,
    outlineWidth,
    shadowColor,
    shadowBlur,
    shadowOffsetX,
    shadowOffsetY,
    glowColor,
    glowStrength,
  } = layer;

  ctx.save();

  const cx = (x || 0) + width / 2;
  const cy = (y || 0) + height / 2;
  ctx.translate(cx, cy);
  ctx.rotate((rotation || 0) * Math.PI / 180);
  ctx.translate(-width / 2, -height / 2);

  // Use renderStickerEffects when available to render outline/shadow/glow passes
  renderStickerEffects(ctx, image, {
    outlineWidth,
    outlineColor,
    shadowBlur,
    shadowColor,
    shadowOffsetX,
    shadowOffsetY,
    glowStrength,
    glowColor,
  }, scale, width, height);

  // Final image draw
  ctx.drawImage(image, 0, 0, width, height);

  // Reset any lingering shadow state for safety
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.restore();
}