import { z } from "zod";

export const colorConverterInputSchema = z.object({
  color: z.string().min(1, "Color value is required"),
  inputFormat: z.enum(["hex", "rgb", "hsl", "hsv"]),
});

export const colorConverterOutputSchema = z.object({
  hex: z.string(),
  rgb: z.object({
    r: z.number(),
    g: z.number(),
    b: z.number(),
    string: z.string(),
  }),
  hsl: z.object({
    h: z.number(),
    s: z.number(),
    l: z.number(),
    string: z.string(),
  }),
  hsv: z.object({
    h: z.number(),
    s: z.number(),
    v: z.number(),
    string: z.string(),
  }),
  preview: z.string(), // CSS color value for preview
});

export type ColorConverterInput = z.infer<typeof colorConverterInputSchema>;
export type ColorConverterOutput = z.infer<typeof colorConverterOutputSchema>;

export function colorConverter(input: ColorConverterInput): ColorConverterOutput {
  const { color, inputFormat } = input;
  
  let r: number, g: number, b: number;

  // Parse input color to RGB
  switch (inputFormat) {
    case "hex":
      const hex = color.replace("#", "");
      if (hex.length !== 6) throw new Error("Invalid hex color format");
      r = parseInt(hex.substr(0, 2), 16);
      g = parseInt(hex.substr(2, 2), 16);
      b = parseInt(hex.substr(4, 2), 16);
      break;
      
    case "rgb":
      const rgbMatch = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (!rgbMatch) throw new Error("Invalid RGB format");
      r = parseInt(rgbMatch[1]);
      g = parseInt(rgbMatch[2]);
      b = parseInt(rgbMatch[3]);
      break;
      
    case "hsl":
      const hslMatch = color.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
      if (!hslMatch) throw new Error("Invalid HSL format");
      const [hslR, hslG, hslB] = hslToRgb(
        parseInt(hslMatch[1]),
        parseInt(hslMatch[2]) / 100,
        parseInt(hslMatch[3]) / 100
      );
      r = hslR;
      g = hslG;
      b = hslB;
      break;
      
    case "hsv":
      const hsvMatch = color.match(/hsv\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
      if (!hsvMatch) throw new Error("Invalid HSV format");
      const [hsvR, hsvG, hsvB] = hsvToRgb(
        parseInt(hsvMatch[1]),
        parseInt(hsvMatch[2]) / 100,
        parseInt(hsvMatch[3]) / 100
      );
      r = hsvR;
      g = hsvG;
      b = hsvB;
      break;
      
    default:
      throw new Error("Unsupported input format");
  }

  // Convert RGB to other formats
  const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  
  const [h, s, l] = rgbToHsl(r, g, b);
  const [hsvH, hsvS, v] = rgbToHsv(r, g, b);

  return {
    hex,
    rgb: {
      r,
      g,
      b,
      string: `rgb(${r}, ${g}, ${b})`,
    },
    hsl: {
      h: Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
      string: `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
    },
    hsv: {
      h: Math.round(hsvH),
      s: Math.round(hsvS * 100),
      v: Math.round(v * 100),
      string: `hsv(${Math.round(hsvH)}, ${Math.round(hsvS * 100)}%, ${Math.round(v * 100)}%)`,
    },
    preview: hex,
  };
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s, l];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;

  if (max === min) {
    h = 0;
  } else {
    const d = max - min;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h * 360, s, v];
}