import { describe, it, expect } from 'vitest';
import { toolBuilderService } from '../tool-builder-service';

describe('ToolBuilderService - Variable Replacement Methods', () => {
  describe('replaceVariables', () => {
    it('should replace simple variables with {varname} format', () => {
      const template = 'Hello {name}, you are {age} years old';
      const context = { name: 'Alice', age: 30 };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Hello Alice, you are 30 years old');
    });

    it('should replace simple variables with {{varname}} format', () => {
      const template = 'Hello {{name}}, you are {{age}} years old';
      const context = { name: 'Bob', age: 25 };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Hello Bob, you are 25 years old');
    });

    it('should replace simple variables with ${varname} format', () => {
      const template = 'Hello ${name}, you are ${age} years old';
      const context = { name: 'Charlie', age: 35 };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Hello Charlie, you are 35 years old');
    });

    it('should handle nested property access with {step.property} format', () => {
      const template = 'Result: {step.value}';
      const context = { step: { value: 42 } };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Result: 42');
    });

    it('should handle deeply nested property access {step.nested.deep}', () => {
      const template = 'Deep value: {data.user.profile.name}';
      const context = { 
        data: { 
          user: { 
            profile: { 
              name: 'Deep User' 
            } 
          } 
        } 
      };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Deep value: Deep User');
    });

    it('should leave placeholder unchanged for undefined values', () => {
      const template = 'Value: {missing}';
      const context = { other: 'value' };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Value: {missing}');
    });

    it('should leave placeholder unchanged for null values', () => {
      const template = 'Value: {nullValue}';
      const context = { nullValue: null };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Value: null');
    });

    it('should leave placeholder unchanged for missing nested properties', () => {
      const template = 'Value: {step.missing.property}';
      const context = { step: { other: 'value' } };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Value: {step.missing.property}');
    });

    it('should handle mixed templates with multiple variables', () => {
      const template = 'Name: {name}, Age: {{age}}, City: ${city}';
      const context = { name: 'Alice', age: 30, city: 'NYC' };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Name: Alice, Age: 30, City: NYC');
    });

    it('should handle multiple variables of same format in one string', () => {
      const template = '{firstName} {lastName} is {age} years old';
      const context = { firstName: 'John', lastName: 'Doe', age: 28 };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('John Doe is 28 years old');
    });

    it('should format objects using JSON.stringify', () => {
      const template = 'Data: {userData}';
      const context = { userData: { id: 1, name: 'Alice' } };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toContain('"id": 1');
      expect(result).toContain('"name": "Alice"');
    });

    it('should format arrays using JSON.stringify', () => {
      const template = 'Items: {items}';
      const context = { items: [1, 2, 3] };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toContain('[');
      expect(result).toContain('1');
      expect(result).toContain('2');
      expect(result).toContain('3');
    });

    it('should handle boolean values correctly', () => {
      const template = 'Active: {isActive}, Disabled: {isDisabled}';
      const context = { isActive: true, isDisabled: false };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Active: true, Disabled: false');
    });

    it('should handle number zero correctly', () => {
      const template = 'Count: {count}';
      const context = { count: 0 };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Count: 0');
    });

    it('should handle empty string values', () => {
      const template = 'Value: {empty}';
      const context = { empty: '' };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('Value: ');
    });

    it('should handle mixed nested and simple variables', () => {
      const template = 'User {user.name} has {count} items in {category}';
      const context = { 
        user: { name: 'Alice' }, 
        count: 5, 
        category: 'Shopping' 
      };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      expect(result).toBe('User Alice has 5 items in Shopping');
    });
  });

  describe('getNestedValue', () => {
    it('should get simple property value', () => {
      const context = { name: 'Alice', age: 30 };
      const result = (toolBuilderService as any).getNestedValue(context, 'name');
      expect(result).toBe('Alice');
    });

    it('should get nested property value with single level', () => {
      const context = { user: { name: 'Bob' } };
      const result = (toolBuilderService as any).getNestedValue(context, 'user.name');
      expect(result).toBe('Bob');
    });

    it('should get deeply nested property value', () => {
      const context = { 
        data: { 
          user: { 
            profile: { 
              email: 'test@example.com' 
            } 
          } 
        } 
      };
      const result = (toolBuilderService as any).getNestedValue(context, 'data.user.profile.email');
      expect(result).toBe('test@example.com');
    });

    it('should return undefined for missing simple property', () => {
      const context = { name: 'Alice' };
      const result = (toolBuilderService as any).getNestedValue(context, 'age');
      expect(result).toBeUndefined();
    });

    it('should return undefined for missing nested property', () => {
      const context = { user: { name: 'Alice' } };
      const result = (toolBuilderService as any).getNestedValue(context, 'user.age');
      expect(result).toBeUndefined();
    });

    it('should return undefined when accessing property on null', () => {
      const context = { user: null };
      const result = (toolBuilderService as any).getNestedValue(context, 'user.name');
      expect(result).toBeUndefined();
    });

    it('should return undefined when accessing property on undefined', () => {
      const context = { user: undefined };
      const result = (toolBuilderService as any).getNestedValue(context, 'user.name');
      expect(result).toBeUndefined();
    });

    it('should handle object values', () => {
      const context = { data: { nested: { value: 'test' } } };
      const result = (toolBuilderService as any).getNestedValue(context, 'data.nested');
      expect(result).toEqual({ value: 'test' });
    });

    it('should handle array values', () => {
      const context = { items: [1, 2, 3] };
      const result = (toolBuilderService as any).getNestedValue(context, 'items');
      expect(result).toEqual([1, 2, 3]);
    });

    it('should return null value correctly', () => {
      const context = { value: null };
      const result = (toolBuilderService as any).getNestedValue(context, 'value');
      expect(result).toBeNull();
    });

    it('should handle numeric property values', () => {
      const context = { step_123: { result: 42 } };
      const result = (toolBuilderService as any).getNestedValue(context, 'step_123.result');
      expect(result).toBe(42);
    });
  });

  describe('formatValue', () => {
    it('should format string values as-is', () => {
      const result = (toolBuilderService as any).formatValue('hello world');
      expect(result).toBe('hello world');
    });

    it('should format number values as strings', () => {
      const result = (toolBuilderService as any).formatValue(42);
      expect(result).toBe('42');
    });

    it('should format boolean true correctly', () => {
      const result = (toolBuilderService as any).formatValue(true);
      expect(result).toBe('true');
    });

    it('should format boolean false correctly', () => {
      const result = (toolBuilderService as any).formatValue(false);
      expect(result).toBe('false');
    });

    it('should format null as "null"', () => {
      const result = (toolBuilderService as any).formatValue(null);
      expect(result).toBe('null');
    });

    it('should format undefined as "undefined"', () => {
      const result = (toolBuilderService as any).formatValue(undefined);
      expect(result).toBe('undefined');
    });

    it('should format zero correctly', () => {
      const result = (toolBuilderService as any).formatValue(0);
      expect(result).toBe('0');
    });

    it('should format negative numbers correctly', () => {
      const result = (toolBuilderService as any).formatValue(-10);
      expect(result).toBe('-10');
    });

    it('should format decimal numbers correctly', () => {
      const result = (toolBuilderService as any).formatValue(3.14);
      expect(result).toBe('3.14');
    });

    it('should format objects using JSON.stringify with indentation', () => {
      const obj = { id: 1, name: 'Alice', active: true };
      const result = (toolBuilderService as any).formatValue(obj);
      expect(result).toContain('"id": 1');
      expect(result).toContain('"name": "Alice"');
      expect(result).toContain('"active": true');
      expect(result).toContain('\n'); // Should have indentation
    });

    it('should format arrays using JSON.stringify with indentation', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = (toolBuilderService as any).formatValue(arr);
      expect(result).toContain('[');
      expect(result).toContain(']');
      expect(result).toContain('1');
      expect(result).toContain('5');
    });

    it('should format nested objects correctly', () => {
      const obj = { 
        user: { 
          name: 'Bob', 
          profile: { 
            age: 30 
          } 
        } 
      };
      const result = (toolBuilderService as any).formatValue(obj);
      expect(result).toContain('"user"');
      expect(result).toContain('"name": "Bob"');
      expect(result).toContain('"profile"');
      expect(result).toContain('"age": 30');
    });

    it('should format arrays of objects correctly', () => {
      const arr = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ];
      const result = (toolBuilderService as any).formatValue(arr);
      expect(result).toContain('"id": 1');
      expect(result).toContain('"name": "Alice"');
      expect(result).toContain('"id": 2');
      expect(result).toContain('"name": "Bob"');
    });

    it('should format empty object correctly', () => {
      const result = (toolBuilderService as any).formatValue({});
      expect(result).toBe('{}');
    });

    it('should format empty array correctly', () => {
      const result = (toolBuilderService as any).formatValue([]);
      expect(result).toBe('[]');
    });

    it('should handle empty string correctly', () => {
      const result = (toolBuilderService as any).formatValue('');
      expect(result).toBe('');
    });

    it('should format string with special characters correctly', () => {
      const result = (toolBuilderService as any).formatValue('Hello\nWorld\t!');
      expect(result).toBe('Hello\nWorld\t!');
    });
  });

  describe('Integration - All methods working together', () => {
    it('should correctly replace variables and format complex nested data', () => {
      const template = 'User: {user.name}, Score: {score}, Data: {data}';
      const context = {
        user: { name: 'Alice', id: 123 },
        score: 95.5,
        data: { items: [1, 2, 3], active: true }
      };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      
      expect(result).toContain('User: Alice');
      expect(result).toContain('Score: 95.5');
      expect(result).toContain('"items"');
      expect(result).toContain('"active": true');
    });

    it('should handle step results with various data types', () => {
      const template = 'Step 1: {step_1}, Step 2: {step_2}, Step 3: {step_3}';
      const context = {
        step_1: 'Text result',
        step_2: 42,
        step_3: { result: 'success', value: 100 }
      };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      
      expect(result).toContain('Step 1: Text result');
      expect(result).toContain('Step 2: 42');
      expect(result).toContain('"result": "success"');
      expect(result).toContain('"value": 100');
    });

    it('should preserve unchanged placeholders when values are missing', () => {
      const template = 'Found: {exists}, Missing: {notThere}, Nested: {obj.missing}';
      const context = {
        exists: 'yes',
        obj: { other: 'value' }
      };
      const result = (toolBuilderService as any).replaceVariables(template, context);
      
      expect(result).toContain('Found: yes');
      expect(result).toContain('Missing: {notThere}');
      expect(result).toContain('Nested: {obj.missing}');
    });
  });
});
