/**
 * Safely inserts CSS rules into a style element's sheet
 * Handles cases where the sheet is not yet ready or insertRule is not available
 * 
 * @param styleElement - The HTMLStyleElement to insert rules into
 * @param rule - The CSS rule string to insert
 * @param index - Optional index at which to insert the rule (defaults to end)
 */
export function safeInsertRule(
  styleElement: HTMLStyleElement,
  rule: string,
  index?: number
): void {
  try {
    const sheet = styleElement.sheet as CSSStyleSheet | null;
    
    if (!sheet) {
      // Sheet is not ready yet, wait for it to load
      // Try multiple approaches to ensure the rule is inserted
      
      // Approach 1: Listen for load event
      styleElement.addEventListener('load', () => {
        try {
          const loadedSheet = styleElement.sheet as CSSStyleSheet;
          if (loadedSheet) {
            const insertIndex = index !== undefined ? index : loadedSheet.cssRules.length;
            loadedSheet.insertRule(rule, insertIndex);
          }
        } catch (e) {
          console.warn('Failed to insert rule on load:', e);
        }
      }, { once: true });
      
      // Approach 2: Try on next animation frame
      requestAnimationFrame(() => {
        try {
          const rafSheet = styleElement.sheet as CSSStyleSheet;
          if (rafSheet) {
            const insertIndex = index !== undefined ? index : rafSheet.cssRules.length;
            rafSheet.insertRule(rule, insertIndex);
          }
        } catch (e) {
          // Silently fail - load event handler will catch it
        }
      });
      
      return;
    }
    
    // Sheet is ready, insert the rule
    const insertIndex = index !== undefined ? index : sheet.cssRules.length;
    sheet.insertRule(rule, insertIndex);
  } catch (error) {
    // If insertRule fails, fall back to appending text content
    console.warn('insertRule failed, falling back to text content:', error);
    try {
      styleElement.appendChild(document.createTextNode(rule));
    } catch (fallbackError) {
      console.error('Failed to insert style rule:', fallbackError);
    }
  }
}

/**
 * Creates a style element with a CSS rule safely
 * Useful for dynamically creating styles that need to be inserted into the document
 * 
 * @param rule - The CSS rule string to insert
 * @param id - Optional ID for the style element
 * @returns The created style element
 */
export function createStyleElement(rule: string, id?: string): HTMLStyleElement {
  const style = document.createElement('style');
  if (id) {
    style.id = id;
  }
  
  // Append to head first so the sheet is available
  document.head.appendChild(style);
  
  // Now safely insert the rule
  safeInsertRule(style, rule);
  
  return style;
}

/**
 * Removes a style element by ID
 * 
 * @param id - The ID of the style element to remove
 * @returns true if the element was found and removed, false otherwise
 */
export function removeStyleElement(id: string): boolean {
  const element = document.getElementById(id);
  if (element && element.tagName === 'STYLE') {
    element.remove();
    return true;
  }
  return false;
}
