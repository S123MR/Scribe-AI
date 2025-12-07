export enum HandwritingFont {
  CAVEAT = 'Caveat',
  INDIE_FLOWER = 'Indie Flower',
  PATRICK_HAND = 'Patrick Hand',
  SHADOWS = 'Shadows Into Light',
  KALAM = 'Kalam',
  GLORIA = 'Gloria Hallelujah',
}

export enum PaperType {
  PLAIN = 'PLAIN',
  LINED = 'LINED',
  GRID = 'GRID',
  DOTTED = 'DOTTED',
  VINTAGE = 'VINTAGE',
}

export enum InkColor {
  BLUE = '#1e3a8a', // dark blue
  BLACK = '#1a1a1a',
  RED = '#b91c1c',
  PENCIL = '#52525b', // dark gray
  GREEN = '#15803d',
}

export enum TableStyle {
  BORDERS = 'BORDERS',
  STRIPED = 'STRIPED',
  MINIMAL = 'MINIMAL'
}

export interface NoteSettings {
  font: HandwritingFont;
  paperType: PaperType;
  inkColor: InkColor;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paperColor: string;
  tableStyle: TableStyle;
}

export interface GenerationState {
  isGenerating: boolean;
  error: string | null;
}