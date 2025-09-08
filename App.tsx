import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Layer, LayerType, TextLayerProps, StickerLayerProps, CommonLayerProps, MemeTemplateOption, ActiveInteraction, InteractionType, StickerOption } from './types';
import { BRAND_COLORS, INITIAL_TEXT_LAYER, MAX_Z_INDEX, MIN_LAYER_DIMENSION, INITIAL_STICKER_LAYER } from './constants';
import MemeCanvas from './components/MemeCanvas';
import Toolbar from './components/Toolbar';
import MemeTemplateGallery from './components/MemeTemplateGallery';
import html2canvas from 'html2canvas';
import { useTelegram } from '@/lib/hooks/useTelegram';
import { TelegramActions } from '@/components/TelegramActions';
import measureText from '@/lib/utils/textMeasurement';
import './styles/telegram.css';


const App: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState<number>(1);
  const [showMemeTemplateGallery, setShowMemeTemplateGallery] = useState<boolean>(false);
  const [dynamicTemplates, setDynamicTemplates] = useState<MemeTemplateOption[]>([]);
  const [dynamicStickers, setDynamicStickers] = useState<StickerOption[]>([]);
  
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
  const memeCanvasRef = useRef<HTMLDivElement>(null);
  const mainCanvasAreaRef = useRef<HTMLDivElement>(null);

  const { isTelegramWebApp, setupMainButton, hideMainButton, showAlert } = useTelegram();

  const hasContent = baseImage || layers.length > 0;

  const resetCanvas = () => {
    setLayers([]);
    setSelectedLayerId(null);
    setNextZIndex(1);
    setActiveInteraction(null);
    setImageDimensions(null);
  };

  const handleSetBaseImage = (src: string) => {
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setBaseImage(src);
      resetCanvas(); // Reset layers and other states, but not the new dimensions
    };
    img.onerror = () => {
        showAlert("Couldn't load the selected image.");
        setBaseImage(null);
        setImageDimensions(null);
    };
    img.src = src;
  };

  useEffect(() => {
    if (!isTelegramWebApp) return;

    if (hasContent) {
      setupMainButton('Share Meme 📤', () => {
        const telegramActions = document.querySelector('.telegram-actions-banner');
        if (telegramActions) {
          telegramActions.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } else {
      setupMainButton('Get Started 🎨', () => {
        showAlert('Upload an image or choose a template to start creating!');
      });
    }

    return () => {
      hideMainButton();
    };
  }, [isTelegramWebApp, hasContent, setupMainButton, hideMainButton, showAlert]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleSetBaseImage(e.target?.result as string);
      };
      reader.readAsDataURL(event.target.files[0]);
      event.target.value = '';
    }
  };

  const handleSelectMemeTemplate = (template: MemeTemplateOption) => {
    handleSetBaseImage(template.src);
    setShowMemeTemplateGallery(false);
  };

  const addNewLayer = useCallback(<T extends LayerType,>(type: T, props: Partial<Layer> = {}) => {
    const commonProps: Omit<CommonLayerProps, 'type' | 'width' | 'height'> = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      x: 50,
      y: 50,
      rotation: 0,
      zIndex: nextZIndex,
    };

    if (type === LayerType.TEXT) {
      const relevantOverrides = props as Partial<TextLayerProps>;
      const initialText = relevantOverrides.text || INITIAL_TEXT_LAYER.text;
      const initialFontFamily = relevantOverrides.fontFamily || INITIAL_TEXT_LAYER.fontFamily;
      const initialFontSize = relevantOverrides.fontSize || INITIAL_TEXT_LAYER.fontSize;

      const measuredSize = measureText(initialText, {
        fontFamily: initialFontFamily,
        fontSize: initialFontSize,
      });

      const newLayer: TextLayerProps = {
        ...commonProps,
        type: LayerType.TEXT as const,
        width: measuredSize.width + TEXT_EFFECTS_HORIZONTAL_PADDING,
        height: measuredSize.height + TEXT_EFFECTS_VERTICAL_PADDING,
        ...INITIAL_TEXT_LAYER,
        ...relevantOverrides,
      };
      setLayers(prevLayers => [...prevLayers, newLayer]);
      setSelectedLayerId(newLayer.id);
      setNextZIndex(prevZ => Math.min(prevZ + 1, MAX_Z_INDEX));
    } else if (type === LayerType.STICKER) {
      const castedProps = props as Partial<StickerLayerProps>;
      if (!castedProps.src) return;

      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        let initialWidth = img.naturalWidth;
        let initialHeight = img.naturalHeight;

        if (mainCanvasAreaRef.current) {
          const canvasRect = mainCanvasAreaRef.current.getBoundingClientRect();
          const maxStickerWidth = canvasRect.width / 4;
          const maxStickerHeight = canvasRect.height / 4;

          if (initialWidth > maxStickerWidth || initialHeight > maxStickerHeight) {
            const widthRatio = maxStickerWidth / initialWidth;
            const heightRatio = maxStickerHeight / initialHeight;
            const scale = Math.min(widthRatio, heightRatio);

            initialWidth *= scale;
            initialHeight *= scale;
          }
        }
        
        const stickerToAdd: StickerLayerProps = {
          ...commonProps,
          type: LayerType.STICKER as const,
          src: castedProps.src!,
          alt: castedProps.alt || 'Sticker',
          aspectRatio: aspectRatio,
          width: initialWidth + STICKER_EFFECTS_HORIZONTAL_PADDING,
          height: initialHeight + STICKER_EFFECTS_VERTICAL_PADDING,
          ...INITIAL_STICKER_LAYER,
          ...(props as Partial<StickerLayerProps>),
        };
        setLayers(prevLayers => [...prevLayers, stickerToAdd]);
        setSelectedLayerId(stickerToAdd.id);
        setNextZIndex(prevZ => Math.min(prevZ + 1, MAX_Z_INDEX));
      };
      img.src = castedProps.src;
    } else {
      console.error("Invalid layer type requested:", type);
      return;
    }
  }, [nextZIndex]);

  const updateLayer = useCallback((id: string, newProps: Partial<Layer>) => {
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        if (layer.id === id) {
          if (layer.type === LayerType.TEXT) {
            const currentTextLayer = layer as TextLayerProps;
            const updatedTextLayer = { ...currentTextLayer, ...newProps } as TextLayerProps;

            // Recalculate dimensions if text content or font styles change
            if (
              newProps.text !== undefined ||
              newProps.fontFamily !== undefined ||
              newProps.fontSize !== undefined
            ) {
              const measuredSize = measureText(updatedTextLayer.text, {
                fontFamily: updatedTextLayer.fontFamily,
                fontSize: updatedTextLayer.fontSize,
              });
              updatedTextLayer.width = measuredSize.width + TEXT_EFFECTS_HORIZONTAL_PADDING;
              updatedTextLayer.height = measuredSize.height + TEXT_EFFECTS_VERTICAL_PADDING;
            }
            return updatedTextLayer;
          } else if (layer.type === LayerType.STICKER) {
            const currentStickerLayer = layer as StickerLayerProps;
            const updatedStickerLayer = { ...currentStickerLayer, ...newProps } as StickerLayerProps;

            // If effect properties change, ensure padding is still applied
            // This assumes the base image dimensions are constant after initial load
            if (
                newProps.outlineWidth !== undefined || newProps.outlineColor !== undefined ||
                newProps.shadowBlur !== undefined || newProps.shadowColor !== undefined ||
                newProps.shadowOffsetX !== undefined || newProps.shadowOffsetY !== undefined ||
                newProps.glowStrength !== undefined || newProps.glowColor !== undefined
            ) {
                // Re-apply padding to original dimensions if effects change
                // This is a simplification; ideally, you'd track the original image dimensions separately
                // For now, we assume the width/height in the layer is the base image size + padding
                // So, we just ensure the padding is there.
                updatedStickerLayer.width = (updatedStickerLayer.width - STICKER_EFFECTS_HORIZONTAL_PADDING) + STICKER_EFFECTS_HORIZONTAL_PADDING;
                updatedStickerLayer.height = (updatedStickerLayer.height - STICKER_EFFECTS_VERTICAL_PADDING) + STICKER_EFFECTS_VERTICAL_PADDING;
            }
            return updatedStickerLayer;
          }
          return { ...layer, ...newProps };
        }
        return layer;
      }).filter(Boolean) as Layer[]
    );
  }, []);
  
  const deleteLayer = useCallback((id: string) => {
    setLayers(prevLayers => prevLayers.filter(layer => layer.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  }, [selectedLayerId]);

  const bringToFront = (id: string) => {
    const newZ = nextZIndex;
    updateLayer(id, { zIndex: newZ });
    setNextZIndex(prevZ => Math.min(prevZ + 1, MAX_Z_INDEX));
  };

  const sendToBack = (id: string) => {
    if (!layers.find(l => l.id === id)) return;
    const minZ = layers.length > 0 ? Math.min(...layers.filter(l => l.id !== id).map(l => l.zIndex)) : 0;
    updateLayer(id, { zIndex: minZ - 1 });
  };

  const selectedLayer = layers.find(layer => layer.id === selectedLayerId) || null;

  const handleExportMeme = () => {
    setSelectedLayerId(null); 
    requestAnimationFrame(() => {
      if (memeCanvasRef.current) {
        const canvasAreaToCapture = memeCanvasRef.current.querySelector('#meme-canvas-interactive-area');
        if (canvasAreaToCapture) {
            html2canvas(canvasAreaToCapture as HTMLElement, { 
              useCORS: true,
              backgroundColor: BRAND_COLORS.primaryBg,
              scale: window.devicePixelRatio * 1.5, 
              logging: false,
              removeContainer: true,
              onclone: (documentClone) => {
                // Hide interaction handles and outlines
                documentClone.querySelectorAll('.interaction-handle').forEach(el => (el as HTMLElement).style.display = 'none');
                documentClone.querySelectorAll('.layer-selected-outline').forEach(el => (el as HTMLElement).style.border = 'none');
              }
            }).then(canvas => {
              const image = canvas.toDataURL('image/jpeg', 0.9);
              const link = document.createElement('a');
              link.download = `sendit-memegen-${Date.now()}.jpg`;
              link.href = image;
              link.click();
            }).catch(err => {
              console.error("Error generating meme:", err);
              alert("Sorry, there was an error generating your meme.");
            });
        } else {
             console.error("Could not find #meme-canvas-interactive-area to capture.");
        }
      }
    });
  };

  
  const handleInteractionStart = useCallback(
    (layerId: string, interactionType: InteractionType, event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>, layerType: LayerType) => {
      event.stopPropagation();
      const currentLayer = layers.find((l) => l.id === layerId);
      if (!currentLayer || !mainCanvasAreaRef.current) return;

      setSelectedLayerId(layerId);
      const newZ = nextZIndex;
      const updatedOriginalLayer = { ...currentLayer, zIndex: newZ };
      setLayers(prev => prev.map(l => l.id === layerId ? updatedOriginalLayer : l));
      setNextZIndex(newZ + 1);

      const canvasRect = mainCanvasAreaRef.current.getBoundingClientRect();
      const isTouchEvent = 'touches' in event;
      const clientX = isTouchEvent ? (event as React.TouchEvent).touches[0].clientX : (event as React.MouseEvent).clientX;
      const clientY = isTouchEvent ? (event as React.TouchEvent).touches[0].clientY : (event as React.MouseEvent).clientY;

      const interactionDetails: Partial<ActiveInteraction> = {};

      if (interactionType === 'move') {
        interactionDetails.clickOffsetX = clientX - canvasRect.left - currentLayer.x;
        interactionDetails.clickOffsetY = clientY - canvasRect.top - currentLayer.y;
      } else if (interactionType === 'rotate') {
        const layerElement = document.getElementById(`layer-render-${currentLayer.id}`);
        const layerRect = layerElement?.getBoundingClientRect();
        if (!layerRect) return;

        interactionDetails.layerCenterX = layerRect.left + layerRect.width / 2;
        interactionDetails.layerCenterY = layerRect.top + layerRect.height / 2;
        interactionDetails.initialMouseAngleToCenterRad = Math.atan2(
          clientY - interactionDetails.layerCenterY,
          clientX - interactionDetails.layerCenterX
        );
        interactionDetails.originalLayerRotationRad = currentLayer.rotation * (Math.PI / 180);
      }

      setActiveInteraction({
        layerId,
        layerType,
        interactionType,
        initialMouseX: clientX,
        initialMouseY: clientY,
        originalLayer: updatedOriginalLayer,
        ...interactionDetails,
      });
    },
    [layers, nextZIndex]
  );

  const handleInteractionMove = useCallback((event: MouseEvent | TouchEvent) => {
    if (!activeInteraction || !mainCanvasAreaRef.current) return;
    if (event.type === 'touchmove') {
        event.preventDefault();
    }

    const canvasRect = mainCanvasAreaRef.current.getBoundingClientRect();
    const isTouchEvent = 'touches' in event;
    const clientX = isTouchEvent ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = isTouchEvent ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    const { interactionType, originalLayer, initialMouseX, initialMouseY, layerType } = activeInteraction;
    
    setLayers((prevLayers) =>
      prevLayers.map((l) => {
        if (l.id !== activeInteraction.layerId) return l;

        let newX = l.x, newY = l.y, newWidth = l.width, newHeight = l.height, newRotation = l.rotation;

        if (interactionType === 'move') {
          newX = clientX - canvasRect.left - (activeInteraction.clickOffsetX || 0);
          newY = clientY - canvasRect.top - (activeInteraction.clickOffsetY || 0);
        } else if (interactionType === 'resize') {
          const deltaX = clientX - initialMouseX;
          const deltaY = clientY - initialMouseY;

          if (layerType === LayerType.STICKER && originalLayer.aspectRatio) {
            newWidth = Math.max(MIN_LAYER_DIMENSION, (originalLayer.width || 0) + deltaX);
            newHeight = Math.max(MIN_LAYER_DIMENSION, newWidth / (originalLayer.aspectRatio || 1));
            const heightFromDeltaY = Math.max(MIN_LAYER_DIMENSION, (originalLayer.height || 0) + deltaY);
            if (heightFromDeltaY / (originalLayer.aspectRatio || 1) > newWidth) {
                newHeight = heightFromDeltaY;
                newWidth = Math.max(MIN_LAYER_DIMENSION, newHeight * (originalLayer.aspectRatio || 1));
            }
          } else {
            newWidth = Math.max(MIN_LAYER_DIMENSION, (originalLayer.width || 0) + deltaX);
            newHeight = Math.max(MIN_LAYER_DIMENSION, (originalLayer.height || 0) + deltaY);
          }
        } else if (interactionType === 'rotate') {
          const { layerCenterX, layerCenterY, initialMouseAngleToCenterRad, originalLayerRotationRad } = activeInteraction;
          if (layerCenterX === undefined || layerCenterY === undefined || initialMouseAngleToCenterRad === undefined || originalLayerRotationRad === undefined) return l;
          
          const currentMouseAngleRad = Math.atan2(clientY - layerCenterY, clientX - layerCenterX);
          const angleDiffRad = currentMouseAngleRad - initialMouseAngleToCenterRad;
          newRotation = (originalLayerRotationRad + angleDiffRad) * (180 / Math.PI);
        }
        return { ...l, x: newX, y: newY, width: newWidth, height: newHeight, rotation: newRotation };
      })
    );
  }, [activeInteraction]);

  const handleInteractionEnd = useCallback(() => {
    setActiveInteraction(null);
  }, []);

  useEffect(() => {
    const moveHandler = (e: Event) => handleInteractionMove(e as MouseEvent | TouchEvent);
    const endHandler = () => handleInteractionEnd();

    if (activeInteraction) {
      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', endHandler);
      window.addEventListener('touchmove', moveHandler, { passive: false });
      window.addEventListener('touchend', endHandler);
    }

    return () => {
      window.removeEventListener('mousemove', moveHandler);
      window.removeEventListener('mouseup', endHandler);
      window.removeEventListener('touchmove', moveHandler);
      window.removeEventListener('touchend', endHandler);
    };
  }, [activeInteraction, handleInteractionMove, handleInteractionEnd]);
  
  useEffect(() => {
    const loadTemplates = async () => {
      const templateModules = import.meta.glob('./public/templates/*.{png,jpg,jpeg,gif}', { eager: true, query: '?url', import: 'default' });
      const loadedTemplates: MemeTemplateOption[] = Object.entries(templateModules).map(([path, src], index) => {
        const name = path.split('/').pop()?.split('.')[0] || `Template ${index + 1}`;
        return {
          id: `template-${name}-${index}`,
          name: name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          src: src as string,
          alt: name,
        };
      });
      setDynamicTemplates(loadedTemplates);
    };

    const loadStickers = async () => {
      const stickerModules = import.meta.glob('./public/stickers/*.{png,jpg,jpeg,gif,svg}', { eager: true, query: '?url', import: 'default' });
      const loadedStickers: StickerOption[] = Object.entries(stickerModules).map(([path, src], index) => {
        const name = path.split('/').pop()?.split('.')[0] || `Sticker ${index + 1}`;
        return {
          id: `sticker-${name}-${index}`,
          src: src as string,
          alt: name,
        };
      });
      setDynamicStickers(loadedStickers);
    };

    loadTemplates();
    loadStickers();

    const handleClickOutside = (event: MouseEvent) => {
      if (mainCanvasAreaRef.current && event.target === mainCanvasAreaRef.current) {
         setSelectedLayerId(null);
         return;
      }

      const toolbarElement = document.getElementById('toolbar');
      if (mainCanvasAreaRef.current && !mainCanvasAreaRef.current.contains(event.target as Node) &&
          (!toolbarElement || !toolbarElement.contains(event.target as Node))) {
        const galleryElement = document.querySelector('.fixed.inset-0.bg-black');
         if (!galleryElement || !galleryElement.contains(event.target as Node)){
            setSelectedLayerId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className={`flex flex-col h-screen bg-primary-bg text-text-white font-sans ${isTelegramWebApp ? 'telegram-webapp' : ''}`}>
      <header className="p-3 sm:p-4 bg-brand-black shadow-md flex justify-between items-center border-b-2 border-accent-green">
        <h1 className="text-2xl sm:text-3xl font-bold text-accent-green">sendit memegen{isTelegramWebApp && <span className="ml-2 text-sm">📱 Telegram</span>}</h1>
        <div className="flex items-center space-x-2 sm:space-x-3">
          <button
            onClick={() => setShowMemeTemplateGallery(true)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-button-green text-brand-black font-semibold rounded-md hover:bg-accent-green transition-colors duration-150 text-xs sm:text-sm`}
          >
            Templates
          </button>
          <label htmlFor="imageUpload" className={`cursor-pointer px-3 py-1.5 sm:px-4 sm:py-2 bg-button-green text-brand-black font-semibold rounded-md hover:bg-accent-green transition-colors duration-150 text-xs sm:text-sm`}>
            Upload
          </label>
          <input
            id="imageUpload"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          {baseImage && !isTelegramWebApp && (
             <button 
                onClick={handleExportMeme}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-accent-green text-brand-black font-semibold rounded-md hover:bg-opacity-80 transition-colors duration-150 text-xs sm:text-sm`}
             >
                Download
             </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        <Toolbar
          id="toolbar"
          layers={layers}
          onAddLayer={addNewLayer}
          selectedLayer={selectedLayer}
          onSelectLayer={setSelectedLayerId}
          onUpdateLayer={updateLayer}
          onDeleteLayer={deleteLayer}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          hasBaseImage={!!baseImage}
          stickers={dynamicStickers}
        />
        <main ref={mainCanvasAreaRef} className="flex-1 p-2 sm:p-4 md:p-6 flex justify-center items-center overflow-auto bg-primary-bg relative">
          {baseImage ? (
            <MemeCanvas
              ref={memeCanvasRef}
              baseImage={baseImage}
              imageDimensions={imageDimensions}
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onInteractionStart={handleInteractionStart}
            />
          ) : (
            <div className="text-center p-6 sm:p-10 border-2 border-dashed border-light-highlight rounded-lg max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl text-secondary-text mb-3 sm:mb-4">Start creating your meme!</h2>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-16 sm:w-16 text-accent-green mx-auto mb-3 sm:mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div className="space-y-3 mt-4">
                <label htmlFor="imageUploadLarge" className={`block w-full cursor-pointer px-4 py-2 sm:px-6 sm:py-3 bg-button-green text-brand-black font-semibold rounded-lg text-sm sm:text-lg hover:bg-accent-green transition-colors duration-150`}>
                  Upload Your Image
                </label>
                <input
                  id="imageUploadLarge"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => setShowMemeTemplateGallery(true)}
                  className={`block w-full px-4 py-2 sm:px-6 sm:py-3 bg-light-highlight text-text-white font-semibold rounded-lg text-sm sm:text-lg hover:border-accent-green border-2 border-transparent hover:text-accent-green transition-colors duration-150`}
                >
                  Or Choose a Template
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
      {showMemeTemplateGallery && (
        <MemeTemplateGallery 
          templates={dynamicTemplates}
          onSelectTemplate={handleSelectMemeTemplate}
          onClose={() => setShowMemeTemplateGallery(false)}
        />
      )}
      {isTelegramWebApp && (
        <TelegramActions
          memeCanvasRef={memeCanvasRef}
          hasLayers={hasContent}
        />
      )}
    </div>
  );
};

export default App;