// EyeDropper API Type Declarations
// https://wicg.github.io/eyedropper-api/

interface ColorSelectionResult {
  sRGBHex: string;
}

interface ColorSelectionOptions {
  signal?: AbortSignal;
}

declare class EyeDropper {
  constructor();
  open(options?: ColorSelectionOptions): Promise<ColorSelectionResult>;
}

interface Window {
  EyeDropper?: typeof EyeDropper;
}

export { EyeDropper, ColorSelectionResult, ColorSelectionOptions };
