/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { safeInsertRule, createStyleElement, removeStyleElement } from '../safe-style-insert';

describe('safe-style-insert', () => {
  beforeEach(() => {
    // Clean up any existing style elements before each test
    document.head.querySelectorAll('style').forEach(el => el.remove());
  });

  afterEach(() => {
    // Clean up after each test
    document.head.querySelectorAll('style').forEach(el => el.remove());
  });

  describe('safeInsertRule', () => {
    it('should insert a rule into a ready style element', () => {
      const style = document.createElement('style');
      document.head.appendChild(style);
      
      safeInsertRule(style, '.test { color: red; }');
      
      expect(style.sheet).toBeTruthy();
      expect(style.sheet!.cssRules.length).toBe(1);
      expect(style.sheet!.cssRules[0].cssText).toContain('color: red');
    });

    it('should insert a rule at a specific index', () => {
      const style = document.createElement('style');
      document.head.appendChild(style);
      
      safeInsertRule(style, '.test1 { color: red; }');
      safeInsertRule(style, '.test2 { color: blue; }', 0);
      
      expect(style.sheet!.cssRules.length).toBe(2);
      expect(style.sheet!.cssRules[0].cssText).toContain('color: blue');
      expect(style.sheet!.cssRules[1].cssText).toContain('color: red');
    });

    it('should handle style element without sheet', () => {
      const style = document.createElement('style');
      // Don't append to document yet, so sheet is null
      
      // Mock the sheet property to return null initially
      Object.defineProperty(style, 'sheet', {
        get: vi.fn(() => null),
        configurable: true
      });
      
      safeInsertRule(style, '.test { color: red; }');
      
      // Should not throw an error
      expect(() => safeInsertRule(style, '.test { color: red; }')).not.toThrow();
    });

    it('should fall back to text content if insertRule fails', () => {
      const style = document.createElement('style');
      document.head.appendChild(style);
      
      // Mock insertRule to throw an error
      const originalInsertRule = CSSStyleSheet.prototype.insertRule;
      CSSStyleSheet.prototype.insertRule = vi.fn(() => {
        throw new Error('insertRule failed');
      });
      
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      safeInsertRule(style, '.test { color: red; }');
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(style.textContent).toContain('.test { color: red; }');
      
      // Restore original insertRule
      CSSStyleSheet.prototype.insertRule = originalInsertRule;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('createStyleElement', () => {
    it('should create a style element with a rule', () => {
      const style = createStyleElement('.test { color: red; }');
      
      expect(style.tagName).toBe('STYLE');
      expect(document.head.contains(style)).toBe(true);
      expect(style.sheet!.cssRules.length).toBeGreaterThan(0);
    });

    it('should create a style element with an ID', () => {
      const style = createStyleElement('.test { color: red; }', 'test-style');
      
      expect(style.id).toBe('test-style');
      expect(document.getElementById('test-style')).toBe(style);
    });
  });

  describe('removeStyleElement', () => {
    it('should remove a style element by ID', () => {
      createStyleElement('.test { color: red; }', 'test-style');
      
      expect(document.getElementById('test-style')).toBeTruthy();
      
      const removed = removeStyleElement('test-style');
      
      expect(removed).toBe(true);
      expect(document.getElementById('test-style')).toBeNull();
    });

    it('should return false if element does not exist', () => {
      const removed = removeStyleElement('non-existent');
      expect(removed).toBe(false);
    });

    it('should return false if element is not a style element', () => {
      const div = document.createElement('div');
      div.id = 'test-div';
      document.body.appendChild(div);
      
      const removed = removeStyleElement('test-div');
      expect(removed).toBe(false);
      
      div.remove();
    });
  });
});
