
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Layer, LayerType, TextLayerProps, StickerLayerProps, CommonLayerProps, MemeTemplateOption, ActiveInteraction, InteractionType, StickerOption } from './types';
import { BRAND_COLORS, INITIAL_TEXT_LAYER, MAX_Z_INDEX, MIN_LAYER_DIMENSION, INITIAL_STICKER_LAYER } from './constants';
import MemeCanvas from './components/MemeCanvas';
import Toolbar from './components/Toolbar';
import MemeTemplateGallery from './components/MemeTemplateGallery';
import html2canvas from 'html2canvas';


const App: React.FC = () => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState<number>(1);
  const [showMemeTemplateGallery, setShowMemeTemplateGallery] = useState<boolean>(false);
  const [dynamicTemplates, setDynamicTemplates] = useState<MemeTemplateOption[]>([]);
  const [dynamicStickers, setDynamicStickers] = useState<StickerOption[]>([]);
  
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
  const memeCanvasRef = useRef<HTMLDivElement>(null); // For canvas area bounds & click outside
  const mainCanvasAreaRef = useRef<HTMLDivElement>(null); // Ref for the main canvas area for interaction bounds

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setBaseImage(e.target?.result as string);
        setLayers([]);
        setSelectedLayerId(null);
        setNextZIndex(1);
        setActiveInteraction(null);
      };
      reader.readAsDataURL(event.target.files[0]);
      event.target.value = '';
    }
  };

  const handleSelectMemeTemplate = (template: MemeTemplateOption) => {
    setBaseImage(template.src);
    setLayers([]);
    setSelectedLayerId(null);
    setNextZIndex(1);
    setActiveInteraction(null);
    setShowMemeTemplateGallery(false);
  };

  const addNewLayer = useCallback(<T extends LayerType,>(type: T, props: Partial<Layer> = {}) => {
    const newLayerBase: CommonLayerProps = { 
      id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type,
      x: 50,
      y: 50,
      width: type === LayerType.TEXT ? 250 : 100,
      height: type === LayerType.TEXT ? 80 : 100,
      rotation: 0,
      zIndex: nextZIndex,
    };

    let newLayer: Layer;

    if (type === LayerType.TEXT) {
      const { aspectRatio: _aspectRatio, src: _src, alt: _alt, ...relevantOverrides } = props as Partial<StickerLayerProps>;
      newLayer = {
        ...newLayerBase,
        ...INITIAL_TEXT_LAYER,
        ...relevantOverrides,
        type: LayerType.TEXT,
      } as TextLayerProps;
    } else if (type === LayerType.STICKER) {
      const castedProps = props as Partial<StickerLayerProps>;
      if (!castedProps.src) return;

      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.width / img.height;
        const initialWidth = img.naturalWidth;
        const initialHeight = img.naturalHeight;
        
        const { text: _text, fontFamily: _fontFamily, fontSize: _fontSize, color: _color,
                outlineColor: _outlineColor, outlineWidth: _outlineWidth,
                shadowColor: _shadowColor, shadowBlur: _shadowBlur, shadowOffsetX: _shadowOffsetX, shadowOffsetY: _shadowOffsetY,
                glowColor: _glowColor, glowStrength: _glowStrength,
                ...relevantOverrides
              } = props as Partial<TextLayerProps>;

        const stickerToAdd: StickerLayerProps = {
          ...newLayerBase,
          width: initialWidth,
          height: initialHeight,
          ...INITIAL_STICKER_LAYER, // Contains no specific props, just for structure
          ...relevantOverrides,
          src: castedProps.src!,
          alt: castedProps.alt || 'Sticker',
          type: LayerType.STICKER,
          aspectRatio: aspectRatio,
        };
        setLayers(prevLayers => [...prevLayers, stickerToAdd]);
        setSelectedLayerId(stickerToAdd.id);
        setNextZIndex(prevZ => Math.min(prevZ + 1, MAX_Z_INDEX));
      };
      img.src = castedProps.src;
      return; // Layer addition is async due to image loading for aspect ratio
    } else {
      console.error("Invalid layer type requested:", type);
      return; 
    }
    
    setLayers(prevLayers => [...prevLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
    setNextZIndex(prevZ => Math.min(prevZ + 1, MAX_Z_INDEX));
  }, [nextZIndex]);

  const updateLayer = useCallback((id: string, newProps: Partial<Layer>) => {
    setLayers(prevLayers =>
      prevLayers.map(layer => {
        if (layer.id === id) {
          // Preserve type and merge, prevent incompatible props
          if (layer.type === LayerType.TEXT && newProps.type === undefined) {
            const { src, alt, aspectRatio, ...textUpdates } = newProps as any;
            return { ...layer, ...textUpdates, type: LayerType.TEXT };
          } else if (layer.type === LayerType.STICKER && newProps.type === undefined) {
            // For sticker layers, directly merge newProps.
            // The newProps will contain the updated effect properties (outline, shadow, glow)
            // which are now part of StickerLayerProps.
            return { ...layer, ...newProps, type: LayerType.STICKER };
          }
          return { ...layer, ...newProps }; // Allow type change if explicitly provided
        }
        return layer;
      }).filter(Boolean) as Layer[] // Filter out potential nulls if robust error handling added
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
      if (memeCanvasRef.current) { // This ref is on MemeCanvas component's outer div
        const canvasAreaToCapture = memeCanvasRef.current.querySelector('#meme-canvas-interactive-area'); // Target specific inner div
        if (canvasAreaToCapture) {
            html2canvas(canvasAreaToCapture as HTMLElement, { 
              useCORS: true,
              backgroundColor: BRAND_COLORS.primaryBg,
              scale: window.devicePixelRatio * 1.5, 
              logging: false,
              removeContainer: true,
              onclone: (documentClone) => {
                documentClone.querySelectorAll('.interaction-handle').forEach(el => (el as HTMLElement).style.display = 'none');
                documentClone.querySelectorAll('.layer-selected-outline').forEach(el => (el as HTMLElement).style.border = 'none');
              }
            }).then(canvas => {
              const image = canvas.toDataURL('image/jpeg', 0.9);
              const link = document.createElement('a');
              link.download = `sendit-fun-${Date.now()}.jpg`;
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
      // updateLayer(layerId, { zIndex: newZ }); // updateLayer is async, direct map is better here for immediate effect
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
        const layerElement = document.getElementById(`layer-render-${currentLayer.id}`); // LayerRenderer main div ID
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
      // For resize, initialMouseX/Y and originalLayer are enough for bottom-right handle

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
        event.preventDefault(); // Prevent scroll on touch
    }

    const canvasRect = mainCanvasAreaRef.current.getBoundingClientRect();
    const isTouchEvent = 'touches' in event;
    const clientX = isTouchEvent ? (event as TouchEvent).touches[0].clientX : (event as MouseEvent).clientX;
    const clientY = isTouchEvent ? (event as TouchEvent).touches[0].clientY : (event as MouseEvent).clientY;

    const { interactionType, originalLayer, initialMouseX, initialMouseY, layerType } = activeInteraction;
    
    setLayers((prevLayers) =>
      prevLayers.map((l) => {
        if (l.id !== activeInteraction.layerId) return l;

        let newX = l.x;
        let newY = l.y;
        let newWidth = l.width;
        let newHeight = l.height;
        let newRotation = l.rotation;

        if (interactionType === 'move') {
          newX = clientX - canvasRect.left - (activeInteraction.clickOffsetX || 0);
          newY = clientY - canvasRect.top - (activeInteraction.clickOffsetY || 0);
        } else if (interactionType === 'resize') {
          const deltaX = clientX - initialMouseX;
          const deltaY = clientY - initialMouseY;

          if (layerType === LayerType.STICKER && originalLayer.aspectRatio) {
            // Resize maintaining aspect ratio (sticker) - from bottom right
            // Prioritize width change and calculate height, or use diagonal logic
            newWidth = Math.max(MIN_LAYER_DIMENSION, originalLayer.width + deltaX);
            newHeight = Math.max(MIN_LAYER_DIMENSION, newWidth / originalLayer.aspectRatio);
            // If height driven by deltaY is proportionally larger, use that
            const heightFromDeltaY = Math.max(MIN_LAYER_DIMENSION, originalLayer.height + deltaY);
            if (heightFromDeltaY / originalLayer.aspectRatio > newWidth) {
                newHeight = heightFromDeltaY;
                newWidth = Math.max(MIN_LAYER_DIMENSION, newHeight * originalLayer.aspectRatio);
            }

          } else { // Text layer or sticker without aspect ratio (fallback)
            newWidth = Math.max(MIN_LAYER_DIMENSION, originalLayer.width + deltaX);
            newHeight = Math.max(MIN_LAYER_DIMENSION, originalLayer.height + deltaY);
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
    // Dynamically load meme templates
    const loadTemplates = async () => {
      const templateModules = import.meta.glob('./public/templates/*.{png,jpg,jpeg,gif}', { eager: true, query: '?url', import: 'default' });
      const loadedTemplates: MemeTemplateOption[] = Object.entries(templateModules).map(([path, src], index) => {
        const name = path.split('/').pop()?.split('.')[0] || `Template ${index + 1}`;
        return {
          id: `template-${name}-${index}`,
          name: name.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // Basic formatting
          src: src as string, // Explicitly cast to string
          alt: name,
        };
      });
      setDynamicTemplates(loadedTemplates);
    };

    // Dynamically load stickers
    const loadStickers = async () => {
      const stickerModules = import.meta.glob('./public/stickers/*.{png,jpg,jpeg,gif,svg}', { eager: true, query: '?url', import: 'default' });
      const loadedStickers: StickerOption[] = Object.entries(stickerModules).map(([path, src], index) => {
        const name = path.split('/').pop()?.split('.')[0] || `Sticker ${index + 1}`;
        return {
          id: `sticker-${name}-${index}`,
          src: src as string, // Explicitly cast to string
          alt: name,
        };
      });
      setDynamicStickers(loadedStickers);
    };

    loadTemplates();
    loadStickers();

    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is on canvas background (mainCanvasAreaRef) itself
      if (mainCanvasAreaRef.current && event.target === mainCanvasAreaRef.current) {
         setSelectedLayerId(null);
         return;
      }

      // Check if click is outside canvas AND toolbar
      const toolbarElement = document.getElementById('toolbar');
      if (mainCanvasAreaRef.current && !mainCanvasAreaRef.current.contains(event.target as Node) &&
          (!toolbarElement || !toolbarElement.contains(event.target as Node))) {
        // Further check it's not within a gallery modal
        const galleryElement = document.querySelector('.fixed.inset-0.bg-black'); // Generic selector for modal backdrops
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
    <div className="flex flex-col h-screen bg-primary-bg text-text-white font-sans">
      <header className="p-3 sm:p-4 bg-brand-black shadow-md flex justify-between items-center border-b-2 border-accent-green">
        <h1 className="text-2xl sm:text-3xl font-bold text-accent-green">SENDIT.MEME</h1>
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
          {baseImage && (
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
          onUpdateLayer={updateLayer} // Still useful for direct property changes from editor
          onDeleteLayer={deleteLayer}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          hasBaseImage={!!baseImage}
          stickers={dynamicStickers}
        />
        <main ref={mainCanvasAreaRef} className="flex-1 p-2 sm:p-4 md:p-6 flex justify-center items-center overflow-auto bg-primary-bg relative">
          {baseImage ? (
            <MemeCanvas
              ref={memeCanvasRef} // This ref is for the MemeCanvas component's wrapper div
              baseImage={baseImage}
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={setSelectedLayerId}
              onInteractionStart={handleInteractionStart} // Pass down interaction starter
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
    </div>
  );
};

export default App;
