import { Layer } from '../types';
import { drawMeme } from './renderPipeline';

export class CanvasExporter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = context;
  }

  /**
   * Create an offscreen render context with scale-aware transform.
   */
  getRenderContext(
    width: number,
    height: number,
    targetScale: number
  ): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; scale: number } {
    const scale = targetScale || 1;
    this.canvas.width = Math.max(1, Math.floor(width * scale));
    this.canvas.height = Math.max(1, Math.floor(height * scale));
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
    return { canvas: this.canvas, ctx: this.ctx, scale };
  }

  /**
   * Export the meme to a data URL using the shared render pipeline
   */
  async exportToDataURL(
    baseImage: HTMLImageElement | HTMLCanvasElement | null,
    layers: Layer[],
    width: number,
    height: number,
    options?: {
      format?: 'image/jpeg' | 'image/png';
      quality?: number;
      targetScale?: number;
    }
  ): Promise<string> {
    const format = options?.format ?? 'image/jpeg';
    const quality = options?.quality ?? 0.9;
    const targetScale = options?.targetScale !== undefined ? options.targetScale : (window.devicePixelRatio || 1);

    const { canvas, ctx, scale } = this.getRenderContext(width, height, targetScale);

    // Clear and draw using the shared pipeline
    ctx.save();
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.restore();

    await drawMeme(ctx, { baseImage, layers, width, height, scale });

    return canvas.toDataURL(format, quality);
  }

  /**
   * Export to blob for sharing APIs using the shared render pipeline
   */
  async exportToBlob(
    baseImage: HTMLImageElement | HTMLCanvasElement | null,
    layers: Layer[],
    width: number,
    height: number,
    options?: {
      format?: 'image/jpeg' | 'image/png';
      quality?: number;
      targetScale?: number;
    }
  ): Promise<Blob> {
    const dataURL = await this.exportToDataURL(baseImage, layers, width, height, options);

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

  /**
   * Clean up resources
   */
  dispose(): void {
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}