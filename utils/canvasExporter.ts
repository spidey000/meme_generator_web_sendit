import { Layer, LayerType, StickerLayerProps, TextLayerProps } from '../types';
import { BRAND_COLORS } from '../constants';
import { StickerEffectManager } from './effectRenderer';

export class CanvasExporter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private effectManager: StickerEffectManager;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = context;
    this.effectManager = new StickerEffectManager();
  }

  /**
   * Export the meme to a data URL using pure canvas rendering
   */
  async exportToDataURL(
    baseImage: HTMLImageElement,
    layers: Layer[],
    width: number,
    height: number,
    format: 'image/jpeg' | 'image/png' = 'image/jpeg',
    quality: number = 0.9
  ): Promise<string> {
    // Set canvas size with high DPI support
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    
    // Scale context for high DPI
    this.ctx.scale(dpr, dpr);
    
    // Clear canvas with background color
    this.ctx.fillStyle = BRAND_COLORS.primaryBg;
    this.ctx.fillRect(0, 0, width, height);

    // Draw base image
    if (baseImage) {
      this.ctx.drawImage(baseImage, 0, 0, width, height);
    }

    // Sort layers by z-index for proper rendering order
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    // Render each layer
    for (const layer of sortedLayers) {
      await this.renderLayer(layer, width, height);
    }

    // Convert to data URL
    return this.canvas.toDataURL(format, quality);
  }

  /**
   * Export to blob for sharing APIs
   */
  async exportToBlob(
    baseImage: HTMLImageElement,
    layers: Layer[],
    width: number,
    height: number,
    format: 'image/jpeg' | 'image/png' = 'image/png',
    quality: number = 1.0
  ): Promise<Blob> {
    const dataURL = await this.exportToDataURL(baseImage, layers, width, height, format, quality);
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else {
          reject(new Error('Failed to convert data URL to blob'));
        }
      };
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.open('GET', dataURL);
      xhr.responseType = 'blob';
      xhr.send();
    });
  }

  private async renderLayer(layer: Layer, canvasWidth: number, canvasHeight: number): Promise<void> {
    if (layer.type === LayerType.TEXT) {
      await this.renderTextLayer(layer as TextLayerProps, canvasWidth, canvasHeight);
    } else if (layer.type === LayerType.STICKER) {
      await this.renderStickerLayer(layer as StickerLayerProps, canvasWidth, canvasHeight);
    }
  }

  private async renderTextLayer(layer: TextLayerProps, canvasWidth: number, canvasHeight: number): Promise<void> {
    const { x, y, width, height, rotation, text, fontFamily, fontSize, color, outlineWidth, outlineColor, shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY, glowStrength, glowColor } = layer;

    this.ctx.save();
    
    // Move to layer center and apply rotation
    this.ctx.translate(x + width / 2, y + height / 2);
    this.ctx.rotate((rotation || 0) * Math.PI / 180);
    this.ctx.translate(-width / 2, -height / 2);

    // Set font properties
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillStyle = color;

    // Apply text effects
    let shadowText = '';
    
    // Outline effect
    if (outlineWidth && outlineWidth > 0 && outlineColor) {
      this.ctx.strokeStyle = outlineColor;
      this.ctx.lineWidth = outlineWidth * 2;
      this.ctx.strokeText(text, width / 2, height / 2);
    }

    // Apply shadow effect
    if (shadowBlur && shadowBlur > 0 && shadowColor) {
      this.ctx.shadowColor = shadowColor;
      this.ctx.shadowBlur = shadowBlur;
      this.ctx.shadowOffsetX = shadowOffsetX || 0;
      this.ctx.shadowOffsetY = shadowOffsetY || 0;
    }

    // Apply glow effect
    if (glowStrength && glowStrength > 0 && glowColor) {
      // Apply multiple layers for glow effect
      this.ctx.save();
      this.ctx.globalAlpha = 0.6;
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = glowStrength * 0.5;
      this.ctx.fillText(text, width / 2, height / 2);
      
      this.ctx.globalAlpha = 0.4;
      this.ctx.shadowBlur = glowStrength;
      this.ctx.fillText(text, width / 2, height / 2);
      
      this.ctx.globalAlpha = 0.2;
      this.ctx.shadowBlur = glowStrength * 1.5;
      this.ctx.fillText(text, width / 2, height / 2);
      this.ctx.restore();
      
      // Reset shadow for main text
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }

    // Draw the text
    this.ctx.fillText(text, width / 2, height / 2);
    
    this.ctx.restore();
  }

  private async renderStickerLayer(layer: StickerLayerProps, canvasWidth: number, canvasHeight: number): Promise<void> {
    const { x, y, width, height, rotation, src } = layer;

    // Load the image
    const imageResult = await StickerEffectManager.loadImage(src);
    if (!imageResult.loaded) {
      console.warn(`Failed to load sticker image: ${src}`);
      return;
    }

    const image = imageResult.image;

    this.ctx.save();
    
    // Move to layer center and apply rotation
    this.ctx.translate(x + width / 2, y + height / 2);
    this.ctx.rotate((rotation || 0) * Math.PI / 180);
    this.ctx.translate(-width / 2, -height / 2);

    // Render with effects using the effect manager
    await this.effectManager.renderToCanvas(this.ctx, layer, image);
    
    this.ctx.restore();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
    this.effectManager.cleanup();
  }
}