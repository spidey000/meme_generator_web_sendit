import { StickerLayerProps } from '../types';

export interface EffectRenderer {
  /**
   * Render effects to DOM element for interactive editing
   */
  renderToDOM(element: HTMLElement, layer: StickerLayerProps): void;
  
  /**
   * Render effects to canvas context for export
   */
  renderToCanvas(ctx: CanvasRenderingContext2D, layer: StickerLayerProps, image: HTMLImageElement): Promise<void>;
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

  async renderToCanvas(ctx: CanvasRenderingContext2D, layer: StickerLayerProps, image: HTMLImageElement): Promise<void> {
    return this.canvasRenderer.render(ctx, layer, image);
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
  
  async render(ctx: CanvasRenderingContext2D, layer: StickerLayerProps, image: HTMLImageElement): Promise<void> {
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

    await this.renderWithEffects(ctx, image, layer.width || 0, layer.height || 0, config);
  }

  private async renderWithEffects(
    ctx: CanvasRenderingContext2D, 
    image: HTMLImageElement, 
    width: number, 
    height: number, 
    config: CanvasEffectConfig
  ): Promise<void> {
    // Save current context state
    ctx.save();

    // Apply transformations (rotation, positioning)
    ctx.translate(width / 2, height / 2);
    // Note: Rotation will be handled by the calling context

    // Apply effects in order: outline -> shadow -> glow -> main image
    await this.applyOutlineEffect(ctx, image, width, height, config);
    await this.applyShadowEffect(ctx, image, width, height, config);
    await this.applyGlowEffect(ctx, image, width, height, config);
    
    // Draw the main image
    ctx.drawImage(image, -width / 2, -height / 2, width, height);

    // Restore context state
    ctx.restore();
  }

  private async applyOutlineEffect(
    ctx: CanvasRenderingContext2D, 
    image: HTMLImageElement, 
    width: number, 
    height: number, 
    config: CanvasEffectConfig
  ): Promise<void> {
    if (!config.outlineWidth || config.outlineWidth <= 0 || !config.outlineColor) return;

    const outlineWidth = config.outlineWidth;
    const outlineColor = config.outlineColor;

    // Draw outline in 8 directions
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
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = outlineColor;

    for (const offset of offsets) {
      ctx.save();
      ctx.translate(offset.x, offset.y);
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
      ctx.restore();
    }

    ctx.restore();
  }

  private async applyShadowEffect(
    ctx: CanvasRenderingContext2D, 
    image: HTMLImageElement, 
    width: number, 
    height: number, 
    config: CanvasEffectConfig
  ): Promise<void> {
    if (!config.shadowBlur || config.shadowBlur <= 0 || !config.shadowColor) return;

    ctx.save();
    ctx.shadowColor = config.shadowColor;
    ctx.shadowBlur = config.shadowBlur;
    ctx.shadowOffsetX = config.shadowOffsetX || 0;
    ctx.shadowOffsetY = config.shadowOffsetY || 0;
    ctx.globalCompositeOperation = 'source-over';
    
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  private async applyGlowEffect(
    ctx: CanvasRenderingContext2D, 
    image: HTMLImageElement, 
    width: number, 
    height: number, 
    config: CanvasEffectConfig
  ): Promise<void> {
    if (!config.glowStrength || config.glowStrength <= 0 || !config.glowColor) return;

    const glowColor = config.glowColor;
    const glowStrength = config.glowStrength;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // Apply multiple layers of glow with increasing blur
    const glowLayers = [
      { blur: glowStrength * 0.3, alpha: 0.8 },
      { blur: glowStrength * 0.6, alpha: 0.6 },
      { blur: glowStrength * 0.9, alpha: 0.4 },
      { blur: glowStrength * 1.2, alpha: 0.2 }
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