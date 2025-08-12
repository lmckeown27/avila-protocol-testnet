/**
 * Color Contrast Utility for WCAG 2.1 Accessibility Compliance
 * 
 * This utility provides functions to check color contrast ratios and suggest
 * improvements to meet accessibility standards.
 * 
 * WCAG 2.1 Guidelines:
 * - AA (Normal Text): 4.5:1 minimum contrast ratio
 * - AAA (Normal Text): 7:1 minimum contrast ratio
 * - AA (Large Text): 3:1 minimum contrast ratio
 * - AAA (Large Text): 4.5:1 minimum contrast ratio
 */

export interface ContrastResult {
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  textSize: string;
  foregroundColor: string;
  backgroundColor: string;
  status: 'AAA' | 'AA' | 'Fail';
  error?: string;
}

export interface ContrastSuggestion {
  color: string;
  ratio: number;
  type?: string;
  name?: string;
  passesAA: boolean;
  passesAAA: boolean;
}

export interface SuggestionResult {
  current: ContrastResult;
  suggestions: ContrastSuggestion[];
  message: string;
  error?: string;
}

export interface AccessibilityReport {
  results: Array<{ element: string } & ContrastResult>;
  summary: {
    totalChecks: number;
    passedAA: number;
    passedAAA: number;
    aaCompliance: number;
    aaaCompliance: number;
  };
}

/**
 * Converts a hex color to RGB values
 * @param hex - Hex color string (e.g., "#FF0000" or "FF0000")
 * @returns RGB object with r, g, b values (0-255)
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Handle both 3 and 6 character hex codes
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * Converts RGB values to sRGB (standardized RGB)
 * @param value - RGB value (0-255)
 * @returns sRGB value (0-1)
 */
function rgbToSrgb(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928 
    ? normalized / 12.92 
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * Calculates the relative luminance of a color
 * @param color - Hex color string
 * @returns Relative luminance value
 */
function calculateLuminance(color: string): number {
  const rgb = hexToRgb(color);
  const r = rgbToSrgb(rgb.r);
  const g = rgbToSrgb(rgb.g);
  const b = rgbToSrgb(rgb.b);
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates the contrast ratio between two colors
 * @param foregroundColor - Foreground color (hex)
 * @param backgroundColor - Background color (hex)
 * @returns Contrast ratio
 */
function calculateContrastRatio(foregroundColor: string, backgroundColor: string): number {
  const foregroundLuminance = calculateLuminance(foregroundColor);
  const backgroundLuminance = calculateLuminance(backgroundColor);
  
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if a contrast ratio meets WCAG 2.1 accessibility standards
 * @param ratio - Contrast ratio
 * @param textSize - Text size category ('normal' or 'large')
 * @returns Object with AA and AAA compliance status
 */
function checkWCAGCompliance(ratio: number, textSize: string = 'normal'): { passesAA: boolean; passesAAA: boolean } {
  if (textSize === 'large') {
    return {
      passesAA: ratio >= 3.0,
      passesAAA: ratio >= 4.5
    };
  }
  
  return {
    passesAA: ratio >= 4.5,
    passesAAA: ratio >= 7.0
  };
}

/**
 * Main function to check color contrast
 * @param foregroundColor - Foreground color (hex)
 * @param backgroundColor - Background color (hex)
 * @param textSize - Text size category ('normal' or 'large')
 * @returns Contrast analysis results
 */
export function checkContrast(foregroundColor: string, backgroundColor: string, textSize: string = 'normal'): ContrastResult {
  try {
    // Validate input colors
    if (!foregroundColor || !backgroundColor) {
      throw new Error('Both foreground and background colors are required');
    }
    
    // Ensure colors are in hex format
    const fg = foregroundColor.startsWith('#') ? foregroundColor : `#${foregroundColor}`;
    const bg = backgroundColor.startsWith('#') ? backgroundColor : `#${backgroundColor}`;
    
    // Calculate contrast ratio
    const ratio = calculateContrastRatio(fg, bg);
    
    // Check WCAG compliance
    const compliance = checkWCAGCompliance(ratio, textSize);
    
    return {
      ratio: Math.round(ratio * 100) / 100, // Round to 2 decimal places
      passesAA: compliance.passesAA,
      passesAAA: compliance.passesAAA,
      textSize,
      foregroundColor: fg,
      backgroundColor: bg,
      status: compliance.passesAAA ? 'AAA' : compliance.passesAA ? 'AA' : 'Fail'
    };
  } catch (error) {
    console.error('Error checking contrast:', error);
    return {
      ratio: 0,
      passesAA: false,
      passesAAA: false,
      textSize,
      foregroundColor: '',
      backgroundColor: '',
      status: 'Fail',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Suggests a better foreground color for improved contrast
 * @param foregroundColor - Current foreground color (hex)
 * @param backgroundColor - Background color (hex)
 * @param textSize - Text size category ('normal' or 'large')
 * @param targetRatio - Target contrast ratio (default: 4.5 for AA)
 * @returns Suggested color improvements
 */
export function suggestBetterContrast(foregroundColor: string, backgroundColor: string, textSize: string = 'normal', targetRatio: number = 4.5): SuggestionResult {
  try {
    const current = checkContrast(foregroundColor, backgroundColor, textSize);
    
    if (current.ratio >= targetRatio) {
      return {
        current: current,
        suggestions: [],
        message: 'Current contrast meets target ratio'
      };
    }
    
    const adjustedColors: ContrastSuggestion[] = [];
    const fgRgb = hexToRgb(foregroundColor);
    
    // Strategy 1: Adjust lightness while preserving hue
    for (let adjustment = 0.1; adjustment <= 0.9; adjustment += 0.1) {
      // Lighter version
      const lighterRgb = {
        r: Math.min(255, Math.round(fgRgb.r + (255 - fgRgb.r) * adjustment)),
        g: Math.min(255, Math.round(fgRgb.g + (255 - fgRgb.g) * adjustment)),
        b: Math.max(0, Math.round(fgRgb.b + (255 - fgRgb.b) * adjustment))
      };
      
      // Darker version
      const darkerRgb = {
        r: Math.max(0, Math.round(fgRgb.r * (1 - adjustment))),
        g: Math.max(0, Math.round(fgRgb.g * (1 - adjustment))),
        b: Math.max(0, Math.round(fgRgb.b * (1 - adjustment)))
      };
      
      const lighterHex = rgbToHex(lighterRgb);
      const darkerHex = rgbToHex(darkerRgb);
      
      const lighterContrast = checkContrast(lighterHex, backgroundColor, textSize);
      const darkerContrast = checkContrast(darkerHex, backgroundColor, textSize);
      
      if (lighterContrast.ratio >= targetRatio) {
        adjustedColors.push({
          color: lighterHex,
          ratio: lighterContrast.ratio,
          type: 'lighter',
          passesAA: lighterContrast.passesAA,
          passesAAA: lighterContrast.passesAAA
        });
      }
      
      if (darkerContrast.ratio >= targetRatio) {
        adjustedColors.push({
          color: darkerHex,
          ratio: darkerContrast.ratio,
          type: 'darker',
          passesAA: darkerContrast.passesAA,
          passesAAA: darkerContrast.passesAAA
        });
      }
    }
    
    // Sort suggestions by contrast ratio (best first)
    adjustedColors.sort((a, b) => b.ratio - a.ratio);
    
    // Strategy 2: Use high-contrast alternatives
    const highContrastAlternatives = [
      { color: '#000000', name: 'Pure Black' },
      { color: '#FFFFFF', name: 'Pure White' },
      { color: '#000080', name: 'Navy Blue' },
      { color: '#800000', name: 'Maroon' },
      { color: '#006400', name: 'Dark Green' }
    ];
    
    const highContrastSuggestions = highContrastAlternatives
      .map(alt => {
        const contrast = checkContrast(alt.color, backgroundColor, textSize);
        return {
          ...alt,
          ratio: contrast.ratio,
          passesAA: contrast.passesAA,
          passesAAA: contrast.passesAAA
        };
      })
      .filter(alt => alt.ratio >= targetRatio)
      .sort((a, b) => b.ratio - a.ratio);
    
    return {
      current: current,
      suggestions: [
        ...adjustedColors.slice(0, 3), // Top 3 adjusted colors
        ...highContrastSuggestions.slice(0, 2) // Top 2 high-contrast alternatives
      ],
      message: `Current contrast (${current.ratio}:1) is below target (${targetRatio}:1). ${adjustedColors.length + highContrastSuggestions.length} alternatives found.`
    };
    
  } catch (error) {
    console.error('Error suggesting better contrast:', error);
    return {
      current: {
        ratio: 0,
        passesAA: false,
        passesAAA: false,
        textSize,
        foregroundColor: '',
        backgroundColor: '',
        status: 'Fail'
      },
      suggestions: [],
      message: 'Error occurred while suggesting better contrast',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Converts RGB values to hex color string
 * @param rgb - RGB object with r, g, b values
 * @returns Hex color string
 */
function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  const toHex = (value: number): string => {
    const hex = Math.round(value).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Utility function to check if a color is light or dark
 * @param color - Hex color string
 * @returns 'light' or 'dark'
 */
export function getColorBrightness(color: string): 'light' | 'dark' {
  const luminance = calculateLuminance(color);
  return luminance > 0.5 ? 'light' : 'dark';
}

/**
 * Utility function to get the opposite brightness color
 * @param color - Hex color string
 * @returns Opposite brightness color (black or white)
 */
export function getOppositeBrightnessColor(color: string): string {
  const brightness = getColorBrightness(color);
  return brightness === 'light' ? '#000000' : '#FFFFFF';
}

/**
 * Batch check multiple color combinations
 * @param colorPairs - Array of {foreground, background, textSize} objects
 * @returns Array of contrast check results
 */
export function batchCheckContrast(colorPairs: Array<{ foreground: string; background: string; textSize?: string }>): ContrastResult[] {
  return colorPairs.map(pair => 
    checkContrast(pair.foreground, pair.background, pair.textSize || 'normal')
  );
}

/**
 * Generate accessibility report for a component
 * @param componentColors - Object with color definitions
 * @returns Accessibility report
 */
export function generateAccessibilityReport(componentColors: { [key: string]: { foreground: string; background: string; textSize?: string } }): AccessibilityReport {
  const results: Array<{ element: string } & ContrastResult> = [];
  let totalChecks = 0;
  let passedAA = 0;
  let passedAAA = 0;
  
  for (const [elementName, colors] of Object.entries(componentColors)) {
    const result = checkContrast(colors.foreground, colors.background, colors.textSize || 'normal');
    results.push({
      element: elementName,
      ...result
    });
    
    totalChecks++;
    if (result.passesAA) passedAA++;
    if (result.passesAAA) passedAAA++;
  }
  
  return {
    results,
    summary: {
      totalChecks,
      passedAA,
      passedAAA,
      aaCompliance: totalChecks > 0 ? (passedAA / totalChecks) * 100 : 0,
      aaaCompliance: totalChecks > 0 ? (passedAAA / totalChecks) * 100 : 0
    }
  };
} 