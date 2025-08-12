import { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { checkContrast, suggestBetterContrast } from '../utils/colorContrast';

interface AccessibilityModeProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

interface ContrastIssue {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  passesAA: boolean;
  passesAAA: boolean;
  suggestions: any[];
}

const AccessibilityMode = ({ isEnabled, onToggle }: AccessibilityModeProps) => {
  const [contrastIssues, setContrastIssues] = useState<ContrastIssue[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<any>(null);

  // Scan for contrast issues when accessibility mode is enabled
  useEffect(() => {
    if (isEnabled) {
      scanForContrastIssues();
    } else {
      // Remove all accessibility highlighting
      removeAccessibilityHighlighting();
    }
  }, [isEnabled]);

  const scanForContrastIssues = () => {
    setIsScanning(true);
    const issues: ContrastIssue[] = [];
    
    try {
      // Get all text elements
      const textElements = document.querySelectorAll('*');
      
      textElements.forEach((element) => {
        const computedStyle = window.getComputedStyle(element);
        const color = computedStyle.color;
        const backgroundColor = computedStyle.backgroundColor;
        
        // Skip elements without text content or with transparent backgrounds
        if (!element.textContent?.trim() || 
            backgroundColor === 'rgba(0, 0, 0, 0)' || 
            backgroundColor === 'transparent') {
          return;
        }
        
        // Convert CSS colors to hex for contrast checking
        const fgHex = cssColorToHex(color);
        const bgHex = cssColorToHex(backgroundColor);
        
        if (fgHex && bgHex) {
          const contrastResult = checkContrast(fgHex, bgHex, 'normal');
          
          if (!contrastResult.passesAA) {
            const suggestions = suggestBetterContrast(fgHex, bgHex, 'normal');
            issues.push({
              element: getElementIdentifier(element),
              foreground: fgHex,
              background: bgHex,
              ratio: contrastResult.ratio,
              passesAA: contrastResult.passesAA,
              passesAAA: contrastResult.passesAAA,
              suggestions: suggestions.suggestions || []
            });
            
            // Highlight the element with a red border
            highlightLowContrastElement(element, contrastResult.ratio);
          }
        }
      });
      
      setContrastIssues(issues);
      setScanResults({
        totalElements: textElements.length,
        issuesFound: issues.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error scanning for contrast issues:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const cssColorToHex = (cssColor: string): string | null => {
    // Handle common CSS color formats
    if (cssColor.startsWith('#')) {
      return cssColor;
    }
    
    if (cssColor.startsWith('rgb')) {
      // Convert rgb/rgba to hex
      const match = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      }
    }
    
    // Handle named colors
    const colorMap: { [key: string]: string } = {
      'black': '#000000',
      'white': '#FFFFFF',
      'red': '#FF0000',
      'green': '#00FF00',
      'blue': '#0000FF',
      'yellow': '#FFFF00',
      'cyan': '#00FFFF',
      'magenta': '#FF00FF',
      'gray': '#808080',
      'grey': '#808080',
      'transparent': '#000000'
    };
    
    return colorMap[cssColor.toLowerCase()] || null;
  };

  const getElementIdentifier = (element: Element): string => {
    // Try to get a meaningful identifier for the element
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    if (element.tagName) {
      return element.tagName.toLowerCase();
    }
    
    return 'unknown-element';
  };

  const highlightLowContrastElement = (element: Element, ratio: number) => {
    // Add accessibility highlighting
    (element as HTMLElement).style.outline = '2px solid red';
    (element as HTMLElement).style.outlineOffset = '2px';
    
    // Add a tooltip-like attribute
    element.setAttribute('data-accessibility-issue', `Low contrast: ${ratio}:1`);
    element.setAttribute('title', `⚠️ Low contrast detected: ${ratio}:1 (should be ≥4.5:1 for AA compliance)`);
  };

  const removeAccessibilityHighlighting = () => {
    // Remove all accessibility highlighting
    const highlightedElements = document.querySelectorAll('[data-accessibility-issue]');
    highlightedElements.forEach(element => {
      (element as HTMLElement).style.outline = '';
      (element as HTMLElement).style.outlineOffset = '';
      element.removeAttribute('data-accessibility-issue');
      element.removeAttribute('title');
    });
    
    setContrastIssues([]);
    setScanResults(null);
  };

  const handleToggle = () => {
    onToggle(!isEnabled);
  };

  const handleRescan = () => {
    if (isEnabled) {
      removeAccessibilityHighlighting();
      setTimeout(scanForContrastIssues, 100);
    }
  };

  return (
    <div className="accessibility-mode">
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
          isEnabled
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
        }`}
        title={isEnabled ? 'Disable Accessibility Mode' : 'Enable Accessibility Mode'}
      >
        {isEnabled ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        <span>Accessibility Mode</span>
      </button>

      {/* Accessibility Panel */}
      {isEnabled && (
        <div className="fixed top-20 right-4 w-96 max-h-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          <div className="bg-red-600 text-white px-4 py-3">
            <h3 className="text-lg font-semibold flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Accessibility Issues</span>
            </h3>
          </div>
          
          <div className="p-4 max-h-80 overflow-y-auto">
            {isScanning ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Scanning for contrast issues...</p>
              </div>
            ) : contrastIssues.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-green-600 dark:text-green-400 font-medium">No contrast issues found!</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">All text meets AA accessibility standards.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Scan Results Summary */}
                {scanResults && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
                      <Info className="w-4 h-4" />
                      <span className="text-sm font-medium">Scan Results</span>
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      Found {contrastIssues.length} issues in {scanResults.totalElements} elements
                      <br />
                      Scanned at {new Date(scanResults.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                )}

                {/* Issues List */}
                <div className="space-y-3">
                  {contrastIssues.map((issue, index) => (
                    <div key={index} className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50 dark:bg-red-900/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-red-800 dark:text-red-200">
                          {issue.element}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          issue.passesAA ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {issue.ratio}:1
                        </span>
                      </div>
                      
                      <div className="text-xs text-red-700 dark:text-red-300 mb-2">
                        <div>Foreground: {issue.foreground}</div>
                        <div>Background: {issue.background}</div>
                      </div>
                      
                      {issue.suggestions.length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline">
                            View {issue.suggestions.length} suggestions
                          </summary>
                          <div className="mt-2 space-y-1">
                            {issue.suggestions.slice(0, 3).map((suggestion, idx) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-700 rounded border">
                                <span className="text-gray-700 dark:text-gray-300">
                                  {suggestion.type || suggestion.name}
                                </span>
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  {suggestion.ratio}:1
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleRescan}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Rescan
                  </button>
                  <button
                    onClick={() => onToggle(false)}
                    className="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibilityMode; 