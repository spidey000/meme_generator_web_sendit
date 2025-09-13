import { StickerLayerProps } from '../types';

export interface EffectRenderer {
  /**
   * Render effects to DOM element for interactive editing
   */
  renderToDOM(element: HTMLElement, layer: StickerLayerProps): void;
  
  /**
   * Render effects to canvas context for export/preview
   */
  renderToCanvas(ctx: CanvasRenderingContext2D, layer: StickerLayerProps, image: HTMLImageElement, scale?: number): Promise<void>;
}

export interface CanvasEffectConfig {
  outlineWidth?: number;
  outlineColor?: string;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  glowStrength?: number;
  glowColor?: string;
}

export interface ImageLoadResult {
  image: HTMLImageElement;
  width: number;
  height: number;
  loaded: boolean;
  error?: string;
}

export class StickerEffectManager implements EffectRenderer {
  private domRenderer: DOMEffectRenderer;
  private canvasRenderer: CanvasEffectRenderer;

  constructor() {
    this.domRenderer = new DOMEffectRenderer();
    this.canvasRenderer = new CanvasEffectRenderer();
  }

  renderToDOM(element: HTMLElement, layer: StickerLayerProps): void {
    this.domRenderer.render(element, layer);
  }

  async renderToCanvas(ctx: CanvasRenderingContext2D, layer: StickerLayerProps, image: HTMLImageElement, scale: number = 1): Promise<void> {
    return this.canvasRenderer.render(ctx, layer, image, scale);
  }

  /**
   * Load image with proper error handling and CORS support
   */
  static loadImage(src: string): Promise<ImageLoadResult> {
    return new Promise((resolve) => {
      const img = new Image();
      
      const cleanup = () => {
        img.onload = null;
        img.onerror = null;
        img.onabort = null;
      };

      img.onload = () => {
        cleanup();
        resolve({
          image: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          loaded: true
        });
      };

      img.onerror = () => {
        cleanup();
        resolve({
          image: img,
          width: 0,
          height: 0,
          loaded: false,
          error: 'Failed to load image'
        });
      };

      img.onabort = () => {
        cleanup();
        resolve({
          image: img,
          width: 0,
          height: 0,
          loaded: false,
          error: 'Image loading aborted'
        });
      };

      // Enable CORS for cross-origin images
      img.crossOrigin = 'anonymous';
      img.src = src;
    });
  }
}

class DOMEffectRenderer {
  render(element: HTMLElement, layer: StickerLayerProps): void {
    const filters: string[] = [];

    // Outline effect (simulated with drop-shadow)
    if (layer.outlineWidth && layer.outlineWidth > 0 && layer.outlineColor) {
      const outlineColor = layer.outlineColor;
      const outlineWidth = layer.outlineWidth;
      // Create 8 drop-shadows for a more even outline
      filters.push(
        `drop-shadow(${outlineWidth}px 0 0 ${outlineColor})`,
        `drop-shadow(-${outlineWidth}px 0 0 ${outlineColor})`,
        `drop-shadow(0 ${outlineWidth}px 0 ${outlineColor})`,
        `drop-shadow(0 -${outlineWidth}px 0 ${outlineColor})`,
        `drop-shadow(${outlineWidth * 0.707}px ${outlineWidth * 0.707}px 0 ${outlineColor})`,
        `drop-shadow(-${outlineWidth * 0.707}px ${outlineWidth * 0.707}px 0 ${outlineColor})`,
        `drop-shadow(${outlineWidth * 0.707}px -${outlineWidth * 0.707}px 0 ${outlineColor})`,
        `drop-shadow(-${outlineWidth * 0.707}px -${outlineWidth * 0.707}px 0 ${outlineColor})`
      );
    }

    // Shadow effect
    if (layer.shadowBlur && layer.shadowBlur > 0 && layer.shadowColor) {
      filters.push(
        `drop-shadow(${layer.shadowOffsetX || 0}px ${layer.shadowOffsetY || 0}px ${layer.shadowBlur}px ${layer.shadowColor})`
      );
    }

    // Glow effect (additional drop-shadows with blur)
    if (layer.glowStrength && layer.glowStrength > 0 && layer.glowColor) {
      const glowColor = layer.glowColor;
      const glowStrength = layer.glowStrength;
      // Add multiple blurred drop-shadows for a glow effect
      filters.push(
        `drop-shadow(0 0 ${glowStrength * 0.5}px ${glowColor})`,
        `drop-shadow(0 0 ${glowStrength}px ${glowColor})`,
        `drop-shadow(0 0 ${glowStrength * 1.5}px ${glowColor})`
      );
    }

    element.style.filter = filters.join(' ');
  }
}

class CanvasEffectRenderer {
  private canvasPool: HTMLCanvasElement[] = [];
  
  async render(ctx: CanvasRenderingContext2D, layer: StickerLayerProps, image: HTMLImageElement, scale: number = 1): Promise<void> {
    const config: CanvasEffectConfig = {
      outlineWidth: layer.outlineWidth,
      outlineColor: layer.outlineColor,
      shadowBlur: layer.shadowBlur,
      shadowColor: layer.shadowColor,
      shadowOffsetX: layer.shadowOffsetX,
      shadowOffsetY: layer.shadowOffsetY,
      glowStrength: layer.glowStrength,
      glowColor: layer.glowColor
    };

    await this.renderWithEffects(ctx, image, (layer.width || 0), (layer.height || 0), config, scale);
  }

  private async renderWithEffects(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    width: number,
    height: number,
    config: CanvasEffectConfig,
    scale: number
  ): Promise<void> {
    // Save current context state
    ctx.save();

    // Apply transformations (rotation, positioning)
    ctx.translate(width / 2, height / 2);
    // Note: Rotation will be handled by the calling context

    // Apply effects in order: outline -> shadow -> glow -> main image
    await this.applyOutlineEffect(ctx, image, width, height, config, scale);
    await this.applyShadowEffect(ctx, image, width, height, config, scale);
    await this.applyGlowEffect(ctx, image, width, height, config, scale);
    
    // Draw the main image
    ctx.drawImage(image, -width / 2, -height / 2, width, height);

    // Restore context state
    ctx.restore();
  }

  /**
   * Draw sticker outline by rendering a tinted alpha silhouette at multiple offsets.
   * Uses an offscreen silhouette and resets canvas state between passes to avoid duplicating the full-color image.
   */
  private async applyOutlineEffect(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    width: number,
    height: number,
    config: CanvasEffectConfig,
    scale: number
  ): Promise<void> {
    // Guard: nothing to do
    if (!config.outlineWidth || config.outlineWidth <= 0 || !config.outlineColor) return;

    const outlineWidth = config.outlineWidth * scale;
    const outlineColor = config.outlineColor;

    // Build a tinted alpha silhouette once on an offscreen canvas, then draw only the silhouette at offsets.
    // This avoids duplicating the full-color sticker content (root cause of "ghost" duplicates).
    const silhouetteCanvas = document.createElement('canvas');
    silhouetteCanvas.width = Math.max(1, Math.floor(width));
    silhouetteCanvas.height = Math.max(1, Math.floor(height));
    const sctx = silhouetteCanvas.getContext('2d');
    if (sctx) {
      // Reset and clear offscreen context to avoid residual state across frames
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.globalAlpha = 1;
      sctx.globalCompositeOperation = 'source-over';
      sctx.shadowColor = 'transparent';
      sctx.shadowBlur = 0;
      sctx.shadowOffsetX = 0;
      sctx.shadowOffsetY = 0;
      sctx.clearRect(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);

      // Draw the base image to establish alpha
      sctx.drawImage(image, 0, 0, width, height);

      // Color the alpha mask with the outline color
      sctx.globalCompositeOperation = 'source-in';
      sctx.fillStyle = outlineColor!;
      sctx.fillRect(0, 0, silhouetteCanvas.width, silhouetteCanvas.height);

      // Reset composite for safety (not strictly necessary since we won't reuse sctx)
      sctx.globalCompositeOperation = 'source-over';
    }

    // Offsets for an 8-direction pseudo-outline
    const offsets = [
      { x: outlineWidth, y: 0 },
      { x: -outlineWidth, y: 0 },
      { x: 0, y: outlineWidth },
      { x: 0, y: -outlineWidth },
      { x: outlineWidth * 0.707, y: outlineWidth * 0.707 },
      { x: -outlineWidth * 0.707, y: outlineWidth * 0.707 },
      { x: outlineWidth * 0.707, y: -outlineWidth * 0.707 },
      { x: -outlineWidth * 0.707, y: -outlineWidth * 0.707 }
    ];

    ctx.save();
    // Ensure clean state for the main context during outline
    ctx.setTransform(ctx.getTransform()); // no-op but ensures API availability across browsers
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    for (const offset of offsets) {
      ctx.save();
      ctx.translate(offset.x, offset.y);
      // Draw only the silhouette, not the original full-color image
      ctx.drawImage(silhouetteCanvas, -width / 2, -height / 2, width, height);
      ctx.restore();
    }

    ctx.restore();
  }

  private async applyShadowEffect(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    width: number,
    height: number,
    config: CanvasEffectConfig,
    scale: number
  ): Promise<void> {
    if (!config.shadowBlur || config.shadowBlur <= 0 || !config.shadowColor) return;

    ctx.save();
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = (config.shadowBlur || 0) * scale;
    ctx.shadowOffsetX = (config.shadowOffsetX || 0) * scale;
    ctx.shadowOffsetY = (config.shadowOffsetY || 0) * scale;
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  private async applyGlowEffect(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    width: number,
    height: number,
    config: CanvasEffectConfig,
    scale: number
  ): Promise<void> {
    if (!config.glowStrength || config.glowStrength <= 0 || !config.glowColor) return;

    const glowColor = config.glowColor;
    const glowStrength = config.glowStrength;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Apply multiple layers of glow with increasing blur
    const glowLayers = [
      { blur: glowStrength * 0.3 * scale, alpha: 0.8 },
      { blur: glowStrength * 0.6 * scale, alpha: 0.6 },
      { blur: glowStrength * 0.9 * scale, alpha: 0.4 },
      { blur: glowStrength * 1.2 * scale, alpha: 0.2 }
    ];

    for (const layer of glowLayers) {
      ctx.save();
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = layer.blur;
      ctx.globalAlpha = layer.alpha;
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.restore();
    }

    ctx.restore();
  }

  private getCanvasFromPool(): HTMLCanvasElement {
    if (this.canvasPool.length > 0) {
      return this.canvasPool.pop()!;
    }
    return document.createElement('canvas');
  }

  private returnCanvasToPool(canvas: HTMLCanvasElement): void {
    // Clear the canvas before returning to pool
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    this.canvasPool.push(canvas);
  }

  cleanup(): void {
    // Clean up canvas pool
    this.canvasPool.forEach(canvas => {
      canvas.width = 0;
      canvas.height = 0;
    });
    this.canvasPool = [];
  }
}

/**
 * Create a tinted alpha-only silhouette of `image` on an offscreen canvas.
 * Offscreen context is reset/cleared to avoid residual drawing state.
 */
function createTintedSilhouette(
  image: HTMLImageElement | HTMLCanvasElement,
  width: number,
  height: number,
  color: string
): HTMLCanvasElement {
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.floor(width));
  off.height = Math.max(1, Math.floor(height));
  const octx = off.getContext('2d')!;
  // Reset/clear
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.globalAlpha = 1;
  octx.globalCompositeOperation = 'source-over';
  octx.shadowColor = 'transparent';
  octx.shadowBlur = 0;
  octx.shadowOffsetX = 0;
  octx.shadowOffsetY = 0;
  octx.clearRect(0, 0, off.width, off.height);
  // Establish alpha
  octx.drawImage(image, 0, 0, width, height);
  // Color the alpha mask
  octx.globalCompositeOperation = 'source-in';
  octx.fillStyle = color;
  octx.fillRect(0, 0, off.width, off.height);
  // Return with composite reset (not reused anyway)
  octx.globalCompositeOperation = 'source-over';
  return off;
}

/**
 * Exported helper for shared pipeline: render sticker effects only.
 * Caller is responsible for final drawImage(image, 0, 0, width, height).
 * The ctx should already be transformed to the sticker's local space.
 */
export function renderStickerEffects(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | HTMLCanvasElement,
  config: CanvasEffectConfig,
  scale: number,
  width: number,
  height: number
): void {
  // Outline (8-direction pseudo-outline)
  if (config.outlineWidth && config.outlineWidth > 0 && config.outlineColor) {
    const w = (config.outlineWidth || 0) * scale;
    const c = config.outlineColor!;
    // Build a tinted silhouette once; draw only the silhouette at offsets to avoid duplicating the image content.
    const silhouette = createTintedSilhouette(image as HTMLImageElement, width, height, c);
    const offsets = [
      { x: w, y: 0 },
      { x: -w, y: 0 },
      { x: 0, y: w },
      { x: 0, y: -w },
      { x: w * 0.707, y: w * 0.707 },
      { x: -w * 0.707, y: w * 0.707 },
      { x: w * 0.707, y: -w * 0.707 },
      { x: -w * 0.707, y: -w * 0.707 },
    ];
    ctx.save();
    // Ensure clean state
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    for (const o of offsets) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.drawImage(silhouette, 0, 0, width, height);
      ctx.restore();
    }
    ctx.restore();
  }

  // Shadow
  if (config.shadowBlur && config.shadowBlur > 0 && config.shadowColor) {
    ctx.save();
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = (config.shadowBlur || 0) * scale;
    ctx.shadowOffsetX = (config.shadowOffsetX || 0) * scale;
    ctx.shadowOffsetY = (config.shadowOffsetY || 0) * scale;
    ctx.drawImage(image, 0, 0, width, height);
    ctx.restore();
  }

  // Glow
  if (config.glowStrength && config.glowStrength > 0 && config.glowColor) {
    const gs = config.glowStrength * scale;
    const layers = [
      { blur: gs * 0.5, alpha: 0.6 },
      { blur: gs * 1.0, alpha: 0.4 },
      { blur: gs * 1.5, alpha: 0.2 },
    ];
    ctx.save();
    for (const l of layers) {
      ctx.save();
      ctx.shadowColor = config.glowColor!;
      ctx.shadowBlur = l.blur;
      ctx.globalAlpha = l.alpha;
      ctx.drawImage(image, 0, 0, width, height);
      ctx.restore();
    }
    ctx.restore();
  }

  // Reset shadow state to avoid contaminating later draws
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}