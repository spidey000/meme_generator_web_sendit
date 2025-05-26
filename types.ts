
export enum LayerType {
  TEXT = 'text',
  STICKER = 'sticker',
}

export interface CommonLayerProps {
  id: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  aspectRatio?: number; // Added for stickers, optional for text
}

export interface TextLayerProps extends CommonLayerProps {
  type: LayerType.TEXT;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  outlineColor: string;
  outlineWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  glowColor: string;
  glowStrength: number;
}

export interface StickerLayerProps extends CommonLayerProps {
  type: LayerType.STICKER;
  src: string;
  alt: string;
  aspectRatio: number; // Stickers will always have an aspect ratio
  outlineColor?: string;
  outlineWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  glowColor?: string;
  glowStrength?: number;
}

export type Layer = TextLayerProps | StickerLayerProps;

export interface FontOption {
  value: string;
  label: string;
}

export interface StickerOption {
  id: string;
  src: string;
  alt: string;
}

export interface MemeTemplateOption {
  id: string;
  name: string;
  src: string;
  alt: string; // For accessibility, can be same as name or more descriptive
}

export interface BrandColors {
  primaryBg: string;
  accentGreen: string;
  buttonGreen: string;
  lightHighlight: string;
  textWhite: string;
  secondaryText: string;
  alertOrange: string;
  brandBlack: string;
}

// Interaction types from the example
export type InteractionType = 'move' | 'resize' | 'rotate';

export interface ActiveInteraction {
  layerId: string;
  layerType: LayerType;
  interactionType: InteractionType;
  // Mouse position at the start of interaction, relative to viewport
  initialMouseX: number;
  initialMouseY: number;
  // Original layer properties at start of interaction
  originalLayer: Layer;
  // For move: offset from layer top-left to mouse click
  clickOffsetX?: number;
  clickOffsetY?: number;
  // For rotate: layer center and initial angle info
  layerCenterX?: number; // relative to viewport
  layerCenterY?: number; // relative to viewport
  initialMouseAngleToCenterRad?: number; // angle from layer center to initial mouse pos
  originalLayerRotationRad?: number; // layer's rotation at start
}
