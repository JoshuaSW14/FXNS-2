import { describe, it, expect, beforeAll } from 'vitest';
import { TOOL_TEMPLATES } from '../shared/tool-templates';
import toolBuilderService from '../server/tool-builder-service';

describe('Template Tools QA Tests', () => {

  describe('Template Configuration Validation', () => {
    TOOL_TEMPLATES.forEach((template) => {
      describe(`${template.name} (${template.id})`, () => {
        it('should have all required fields', () => {
          expect(template.id).toBeDefined();
          expect(template.name).toBeDefined();
          expect(template.description).toBeDefined();
          expect(template.category).toBeDefined();
          expect(template.inputConfig).toBeDefined();
          expect(template.logicConfig).toBeDefined();
          expect(template.outputConfig).toBeDefined();
        });

        it('should have valid input configuration', () => {
          expect(Array.isArray(template.inputConfig)).toBe(true);
          expect(template.inputConfig.length).toBeGreaterThan(0);
          
          template.inputConfig.forEach((field) => {
            expect(field.id).toBeDefined();
            expect(field.type).toBeDefined();
            expect(field.label).toBeDefined();
          });
        });

        it('should have valid logic configuration', () => {
          expect(Array.isArray(template.logicConfig)).toBeDefined();
          
          template.logicConfig.forEach((step) => {
            expect(step.id).toBeDefined();
            expect(step.type).toBeDefined();
            expect(step.config).toBeDefined();

            // Validate calculation steps reference valid fields
            if (step.type === 'calculation' && step.config.calculation) {
              const { variables } = step.config.calculation;
              variables?.forEach((variable) => {
                const fieldExists = 
                  template.inputConfig.some(f => f.id === variable.fieldId) ||
                  variable.fieldId.startsWith('step_');
                
                expect(fieldExists).toBe(true);
              });
            }
          });
        });

        it('should have valid output configuration', () => {
          expect(template.outputConfig).toBeDefined();
          expect(template.outputConfig.format).toBeDefined();
          expect(template.outputConfig.sections).toBeDefined();
          expect(Array.isArray(template.outputConfig.sections)).toBe(true);
        });
      });
    });
  });

  describe('Template Execution Tests', () => {
    describe('Tip Calculator', () => {
      it('should correctly calculate tip, total, and per-person amounts', async () => {
        const template = TOOL_TEMPLATES.find(t => t.id === 'tip-calculator');
        expect(template).toBeDefined();

        const testInputs = {
          bill_amount: 100,
          tip_percentage: 20,
          people_count: 4
        };

        const result = await toolBuilderService.testToolTemplate(
          template!.inputConfig,
          template!.logicConfig,
          template!.outputConfig,
          testInputs
        );

        // Expected: 20% of $100 = $20 tip
        expect(result.context.step_tip_amount).toBe(20);
        // Expected: $100 + $20 = $120 total
        expect(result.context.step_total_amount).toBe(120);
        // Expected: $120 / 4 people = $30 per person
        expect(result.context.step_per_person).toBe(30);
      });

      it('should handle different tip percentages', async () => {
        const template = TOOL_TEMPLATES.find(t => t.id === 'tip-calculator');
        
        const testInputs = {
          bill_amount: 50,
          tip_percentage: 15,
          people_count: 2
        };

        const result = await toolBuilderService.testToolTemplate(
          template!.inputConfig,
          template!.logicConfig,
          template!.outputConfig,
          testInputs
        );

        // Expected: 15% of $50 = $7.50 tip
        expect(result.context.step_tip_amount).toBe(7.5);
        // Expected: $50 + $7.50 = $57.50 total
        expect(result.context.step_total_amount).toBe(57.5);
        // Expected: $57.50 / 2 people = $28.75 per person
        expect(result.context.step_per_person).toBe(28.75);
      });
    });

    describe('Loan Calculator', () => {
      it('should correctly calculate monthly payment', async () => {
        const template = TOOL_TEMPLATES.find(t => t.id === 'loan-calculator');
        expect(template).toBeDefined();

        const testInputs = {
          loan_amount: 200000,
          interest_rate: 5,
          loan_term: 30
        };

        const result = await toolBuilderService.testToolTemplate(
          template!.inputConfig,
          template!.logicConfig,
          template!.outputConfig,
          testInputs
        );

        // Monthly payment formula: P[r(1+r)^n]/[(1+r)^n-1]
        // Where P=200000, r=0.05/12=0.00416667, n=30*12=360
        const expectedPayment = 1073.64; // Approximately
        
        expect(result.context.step_monthly_payment).toBeDefined();
        expect(typeof result.context.step_monthly_payment).toBe('number');
        // Allow small margin for rounding
        expect(result.context.step_monthly_payment).toBeGreaterThan(1000);
        expect(result.context.step_monthly_payment).toBeLessThan(1100);
      });
    });

    describe('Unit Converter', () => {
      it('should correctly convert centimeters to meters', async () => {
        const template = TOOL_TEMPLATES.find(t => t.id === 'unit-converter');
        expect(template).toBeDefined();

        const testInputs = {
          value: 100,
          from_unit: 'cm',
          to_unit: 'm'
        };

        const result = await toolBuilderService.testToolTemplate(
          template!.inputConfig,
          template!.logicConfig,
          template!.outputConfig,
          testInputs
        );

        // Expected: 100 cm = 1 meter
        expect(result.context.step_convert_unit).toBe(1);
      });

      it('should correctly convert feet to meters', async () => {
        const template = TOOL_TEMPLATES.find(t => t.id === 'unit-converter');

        const testInputs = {
          value: 10,
          from_unit: 'ft',
          to_unit: 'm'
        };

        const result = await toolBuilderService.testToolTemplate(
          template!.inputConfig,
          template!.logicConfig,
          template!.outputConfig,
          testInputs
        );

        // Expected: 10 feet ≈ 3.048 meters
        expect(result.context.step_convert_unit).toBeCloseTo(3.048, 2);
      });

      it('should correctly convert kilometers to miles', async () => {
        const template = TOOL_TEMPLATES.find(t => t.id === 'unit-converter');

        const testInputs = {
          value: 5,
          from_unit: 'km',
          to_unit: 'mi'
        };

        const result = await toolBuilderService.testToolTemplate(
          template!.inputConfig,
          template!.logicConfig,
          template!.outputConfig,
          testInputs
        );

        // Expected: 5 km ≈ 3.10686 miles
        expect(result.context.step_convert_unit).toBeCloseTo(3.10686, 2);
      });
    });

    describe('Contact Form', () => {
      it('should format contact form message', async () => {
        const template = TOOL_TEMPLATES.find(t => t.id === 'contact-form');
        expect(template).toBeDefined();

        const testInputs = {
          full_name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          subject: 'Test Subject',
          message: 'Test message content'
        };

        const result = await toolBuilderService.testToolTemplate(
          template!.inputConfig,
          template!.logicConfig,
          template!.outputConfig,
          testInputs
        );

        expect(result.context.step_format_message).toBeDefined();
        expect(typeof result.context.step_format_message).toBe('string');
      });
    });

    describe('Password Generator', () => {
      it('should generate password with specified length', async () => {
        const template = TOOL_TEMPLATES.find(t => t.id === 'password-generator');
        expect(template).toBeDefined();

        const testInputs = {
          length: 16,
          include_uppercase: true,
          include_lowercase: true,
          include_numbers: true,
          include_symbols: true,
          count: 3
        };

        const result = await toolBuilderService.testToolTemplate(
          template!.inputConfig,
          template!.logicConfig,
          template!.outputConfig,
          testInputs
        );

        expect(result.context.step_generate_password).toBeDefined();
      });
    });
  });

  describe('Template Formula Validation', () => {
    it('should identify templates with missing field references', () => {
      const brokenTemplates: string[] = [];

      TOOL_TEMPLATES.forEach((template) => {
        template.logicConfig.forEach((step) => {
          if (step.type === 'calculation' && step.config.calculation) {
            const { variables } = step.config.calculation;
            
            variables?.forEach((variable) => {
              const fieldExists = 
                template.inputConfig.some(f => f.id === variable.fieldId) ||
                variable.fieldId.startsWith('step_');
              
              if (!fieldExists) {
                brokenTemplates.push(`${template.name}: references missing field '${variable.fieldId}'`);
              }
            });
          }
        });
      });

      if (brokenTemplates.length > 0) {
        console.error('Broken templates found:', brokenTemplates);
      }

      // This will fail and show us which templates are broken
      expect(brokenTemplates).toEqual([]);
    });
  });
});
