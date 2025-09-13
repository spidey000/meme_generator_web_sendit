import { StickerEffectManager, CanvasEffectConfig } from './effectRenderer';

/**
 * Validates that canvas effects are working correctly
 */
export class EffectValidator {
  private static testCanvas: HTMLCanvasElement | null = null;

  /**
   * Test if canvas rendering is supported in the current browser
   */
  static isCanvasSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch {
      return false;
    }
  }

  /**
   * Test if specific effect types are supported
   */
  static async testEffectSupport(): Promise<{
    outline: boolean;
    shadow: boolean;
    glow: boolean;
    composite: boolean;
  }> {
    if (!this.isCanvasSupported()) {
      return {
        outline: false,
        shadow: false,
        glow: false,
        composite: false
      };
    }

    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return {
        outline: false,
        shadow: false,
        glow: false,
        composite: false
      };
    }

    const results = {
      outline: false,
      shadow: false,
      glow: false,
      composite: false
    };

    try {
      // Test shadow support
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 5;
      ctx.fillRect(10, 10, 50, 50);
      results.shadow = true;

      // Test composite operations
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillRect(20, 20, 30, 30);
      results.composite = true;

      // Test outline simulation (multiple drawings)
      ctx.clearRect(0, 0, 100, 100);
      ctx.fillStyle = 'red';
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const x = 50 + Math.cos(angle) * 3;
        const y = 50 + Math.sin(angle) * 3;
        ctx.fillRect(x - 10, y - 10, 20, 20);
      }
      results.outline = true;

      // Test glow simulation
      ctx.clearRect(0, 0, 100, 100);
      for (let i = 0; i < 3; i++) {
        ctx.shadowColor = `rgba(255,255,0,${0.3 - i * 0.1})`;
        ctx.shadowBlur = 5 + i * 2;
        ctx.fillRect(40, 40, 20, 20);
      }
      results.glow = true;

    } catch (error) {
      console.warn('Effect support test failed:', error);
    }

    return results;
  }

  /**
   * Test image loading with CORS
   */
  static async testImageLoading(src: string): Promise<{
    success: boolean;
    error?: string;
    timing: number;
  }> {
    const startTime = performance.now();
    
    try {
      const result = await StickerEffectManager.loadImage(src);
      const endTime = performance.now();
      
      return {
        success: result.loaded,
        error: result.error,
        timing: endTime - startTime
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timing: endTime - startTime
      };
    }
  }

  /**
   * Validate effect configuration
   */
  static validateEffectConfig(config: CanvasEffectConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate outline
    if (config.outlineWidth !== undefined) {
      if (typeof config.outlineWidth !== 'number' || config.outlineWidth < 0) {
        errors.push('Outline width must be a positive number');
      }
      if (config.outlineWidth > 0 && !config.outlineColor) {
        errors.push('Outline color is required when outline width is specified');
      }
    }

    // Validate shadow
    if (config.shadowBlur !== undefined) {
      if (typeof config.shadowBlur !== 'number' || config.shadowBlur < 0) {
        errors.push('Shadow blur must be a positive number');
      }
      if (config.shadowBlur > 0 && !config.shadowColor) {
        errors.push('Shadow color is required when shadow blur is specified');
      }
    }

    // Validate glow
    if (config.glowStrength !== undefined) {
      if (typeof config.glowStrength !== 'number' || config.glowStrength < 0) {
        errors.push('Glow strength must be a positive number');
      }
      if (config.glowStrength > 0 && !config.glowColor) {
        errors.push('Glow color is required when glow strength is specified');
      }
    }

    // Validate colors
    const colorFields = ['outlineColor', 'shadowColor', 'glowColor'] as const;
    colorFields.forEach(field => {
      const color = config[field];
      if (color && !this.isValidColor(color)) {
        errors.push(`${field} must be a valid color value`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  private static isValidColor(color: string): boolean {
    // Simple color validation
    const s = new Option().style;
    s.color = color;
    return s.color !== '';
  }

  /**
   * Get performance metrics for canvas operations
   */
  static async getPerformanceMetrics(): Promise<{
    canvasSupport: boolean;
    effectSupport: Awaited<ReturnType<typeof EffectValidator.testEffectSupport>>;
    memoryUsage?: number;
    renderSpeed?: number;
  }> {
    const canvasSupport = this.isCanvasSupported();
    const effectSupport = await this.testEffectSupport();

    let memoryUsage: number | undefined;
    let renderSpeed: number | undefined;

    if (canvasSupport) {
      try {
        // Test render speed
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 200;
        testCanvas.height = 200;
        const ctx = testCanvas.getContext('2d');
        
        if (ctx) {
          const startTime = performance.now();
          
          // Perform multiple draw operations
          for (let i = 0; i < 100; i++) {
            ctx.clearRect(0, 0, 200, 200);
            ctx.fillStyle = `hsl(${i * 3.6}, 70%, 50%)`;
            ctx.fillRect(i % 20, Math.floor(i / 20) * 20, 15, 15);
          }
          
          renderSpeed = performance.now() - startTime;
        }

        // Estimate memory usage (rough approximation)
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          if (memory && memory.usedJSHeapSize) {
            memoryUsage = memory.usedJSHeapSize;
          }
        }
      } catch (error) {
        console.warn('Performance metrics test failed:', error);
      }
    }

    return {
      canvasSupport,
      effectSupport,
      memoryUsage,
      renderSpeed
    };
  }
}