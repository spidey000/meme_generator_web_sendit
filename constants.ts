
import { FontOption, StickerOption, BrandColors, TextLayerProps, StickerLayerProps, MemeTemplateOption } from './types';

export const BRAND_COLORS: BrandColors = {
  primaryBg: '#0B0F0A',
  accentGreen: '#C4FF00',
  buttonGreen: '#A1FF00',
  lightHighlight: '#343D27',
  textWhite: '#F0F0F0',
  secondaryText: '#B0B0B0',
  alertOrange: '#FF8C00',
  brandBlack: '#050605',
};

export const DEFAULT_FONTS: FontOption[] = [
  { value: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif', label: 'Impact' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Comic Sans MS", "Comic Sans", cursive', label: 'Comic Sans MS' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: '"Times New Roman", Times, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Courier New", Courier, monospace', label: 'Courier New' },
];

export const DEFAULT_STICKERS: StickerOption[] = [
  { id: 'sticker_sunglasses', src: 'https://picsum.photos/seed/emoji_cool/100/100', alt: 'Cool Emoji' },
  { id: 'sticker_laugh', src: 'https://picsum.photos/seed/emoji_joy/100/100', alt: 'Laughing Emoji' },
  { id: 'sticker_arrow', src: 'https://picsum.photos/seed/shape_arrow/100/100', alt: 'Pointing Arrow' },
  { id: 'sticker_dealwithit', src: 'https://picsum.photos/seed/meme_dealwithit_glasses/150/50', alt: 'Deal With It Glasses' },
  { id: 'sticker_cat', src: 'https://picsum.photos/seed/animal_cat_silly/120/120', alt: 'Silly Cat' },
];

export const DEFAULT_MEME_TEMPLATES: MemeTemplateOption[] = [
  { id: 'template_drake', name: 'Drake Hotline Bling', src: 'https://imgflip.com/s/meme/Drake-Hotline-Bling.jpg', alt: 'Drake Hotline Bling meme template' },
  { id: 'template_distracted_bf', name: 'Distracted Boyfriend', src: 'https://imgflip.com/s/meme/Distracted-Boyfriend.jpg', alt: 'Distracted Boyfriend meme template' },
  { id: 'template_one_does_not_simply', name: 'One Does Not Simply', src: 'https://imgflip.com/s/meme/One-Does-Not-Simply.jpg', alt: 'One Does Not Simply meme template' },
  { id: 'template_change_my_mind', name: 'Change My Mind', src: 'https://imgflip.com/s/meme/Change-My-Mind.jpg', alt: 'Change My Mind meme template' },
  { id: 'template_expanding_brain', name: 'Expanding Brain', src: 'https://imgflip.com/s/meme/Expanding-Brain.jpg', alt: 'Expanding Brain meme template' },
  { id: 'template_success_kid', name: 'Success Kid', src: 'https://imgflip.com/s/meme/Success-Kid.jpg', alt: 'Success Kid meme template' },
  { id: 'template_mocking_spongebob', name: 'Mocking Spongebob', src: 'https://imgflip.com/s/meme/Mocking-Spongebob.jpg', alt: 'Mocking Spongebob meme template' },
  { id: 'template_this_is_fine', name: 'This Is Fine', src: 'https://imgflip.com/s/meme/This-Is-Fine.jpg', alt: 'This Is Fine dog meme template' },
];


export const INITIAL_TEXT_LAYER: Omit<TextLayerProps, 'id' | 'x' | 'y' | 'width' | 'height' | 'zIndex' | 'rotation' | 'type'> = {
  text: 'Sample Text',
  fontFamily: DEFAULT_FONTS[0].value,
  fontSize: 40,
  color: '#FFFFFF',
  outlineColor: '#000000',
  outlineWidth: 2,
  shadowColor: '#000000',
  shadowBlur: 3,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  glowColor: BRAND_COLORS.accentGreen,
  glowStrength: 0,
  // aspectRatio is not strictly needed for text for resize, but can be set if desired. Defaulting to undefined.
};

export const INITIAL_STICKER_LAYER: Omit<StickerLayerProps, 'id' | 'x' | 'y' | 'width' | 'height' | 'zIndex' | 'rotation' | 'type' | 'src' | 'alt' | 'aspectRatio'> = {
  outlineColor: '#000000',
  outlineWidth: 0,
  shadowColor: '#000000',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  glowColor: '#FFFFFF', // White glow by default, but strength is 0
  glowStrength: 0,
};

export const MAX_Z_INDEX = 1000;

// Constants for interaction handles
export const HANDLE_SIZE = 18; // px
export const HANDLE_OFFSET = HANDLE_SIZE / 2; // For centering or offsetting handles
export const MIN_LAYER_DIMENSION = 20; // px, minimum width/height for layers
