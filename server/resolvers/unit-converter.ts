import { z } from "zod";

const unitTypes = [
  'length', 'mass', 'temperature', 'volume', 'area', 'time'
] as const;

const lengthUnits = ['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi'] as const;
const massUnits = ['mg', 'g', 'kg', 'oz', 'lb', 'ton'] as const;
const temperatureUnits = ['C', 'F', 'K'] as const;
const volumeUnits = ['ml', 'l', 'gal', 'qt', 'pt', 'cup', 'fl-oz'] as const;
const areaUnits = ['mm2', 'cm2', 'm2', 'km2', 'in2', 'ft2', 'yd2', 'acre'] as const;
const timeUnits = ['ms', 's', 'min', 'h', 'day', 'week', 'month', 'year'] as const;

export const unitConverterInputSchema = z.object({
  value: z.number(),
  fromUnit: z.string(),
  toUnit: z.string(),
  unitType: z.enum(unitTypes),
});

export const unitConverterOutputSchema = z.object({
  originalValue: z.number(),
  convertedValue: z.number(),
  fromUnit: z.string(),
  toUnit: z.string(),
  unitType: z.string(),
  formula: z.string(),
});

export type UnitConverterInput = z.infer<typeof unitConverterInputSchema>;
export type UnitConverterOutput = z.infer<typeof unitConverterOutputSchema>;

// Conversion factors to base units
const conversions = {
  length: {
    base: 'm',
    factors: {
      mm: 0.001,
      cm: 0.01,
      m: 1,
      km: 1000,
      in: 0.0254,
      ft: 0.3048,
      yd: 0.9144,
      mi: 1609.34,
    },
  },
  mass: {
    base: 'kg',
    factors: {
      mg: 0.000001,
      g: 0.001,
      kg: 1,
      oz: 0.0283495,
      lb: 0.453592,
      ton: 1000,
    },
  },
  volume: {
    base: 'l',
    factors: {
      ml: 0.001,
      l: 1,
      gal: 3.78541,
      qt: 0.946353,
      pt: 0.473176,
      cup: 0.236588,
      'fl-oz': 0.0295735,
    },
  },
  area: {
    base: 'm2',
    factors: {
      mm2: 0.000001,
      cm2: 0.0001,
      m2: 1,
      km2: 1000000,
      in2: 0.00064516,
      ft2: 0.092903,
      yd2: 0.836127,
      acre: 4046.86,
    },
  },
  time: {
    base: 's',
    factors: {
      ms: 0.001,
      s: 1,
      min: 60,
      h: 3600,
      day: 86400,
      week: 604800,
      month: 2629746,
      year: 31556952,
    },
  },
};

function convertTemperature(value: number, fromUnit: string, toUnit: string): number {
  let celsius: number;
  
  // Convert to Celsius first
  switch (fromUnit) {
    case 'C':
      celsius = value;
      break;
    case 'F':
      celsius = (value - 32) * (5/9);
      break;
    case 'K':
      celsius = value - 273.15;
      break;
    default:
      throw new Error(`Unknown temperature unit: ${fromUnit}`);
  }
  
  // Convert from Celsius to target unit
  switch (toUnit) {
    case 'C':
      return celsius;
    case 'F':
      return celsius * (9/5) + 32;
    case 'K':
      return celsius + 273.15;
    default:
      throw new Error(`Unknown temperature unit: ${toUnit}`);
  }
}

export function unitConverterResolver(input: UnitConverterInput): UnitConverterOutput {
  const { value, fromUnit, toUnit, unitType } = input;
  
  let convertedValue: number;
  let formula: string;
  
  if (unitType === 'temperature') {
    convertedValue = convertTemperature(value, fromUnit, toUnit);
    formula = `Temperature conversion from ${fromUnit} to ${toUnit}`;
  } else {
    const conversionData = conversions[unitType as keyof typeof conversions];
    if (!conversionData) {
      throw new Error(`Unsupported unit type: ${unitType}`);
    }
    
    const fromFactor = conversionData.factors[fromUnit as keyof typeof conversionData.factors];
    const toFactor = conversionData.factors[toUnit as keyof typeof conversionData.factors];
    
    if (!fromFactor || !toFactor) {
      throw new Error(`Unsupported unit conversion: ${fromUnit} to ${toUnit}`);
    }
    
    // Convert to base unit, then to target unit
    convertedValue = (value * fromFactor) / toFactor;
    formula = `${value} ${fromUnit} = ${convertedValue} ${toUnit}`;
  }
  
  return {
    originalValue: value,
    convertedValue: Math.round(convertedValue * 1000000) / 1000000, // 6 decimal places
    fromUnit,
    toUnit,
    unitType,
    formula,
  };
}
