import { z } from "zod";

export const qrCodeGeneratorInputSchema = z.object({
  text: z.string().min(1, "Text is required"),
  size: z.number().min(100).max(1000).default(300),
  errorCorrection: z.enum(["L", "M", "Q", "H"]).default("M"),
});

export const qrCodeGeneratorOutputSchema = z.object({
  qrCodeUrl: z.string(),
  downloadUrl: z.string(),
  size: z.number(),
  errorCorrection: z.string(),
});

export type QrCodeGeneratorInput = z.infer<typeof qrCodeGeneratorInputSchema>;
export type QrCodeGeneratorOutput = z.infer<typeof qrCodeGeneratorOutputSchema>;

export function qrCodeGenerator(input: QrCodeGeneratorInput): QrCodeGeneratorOutput {
  const { text, size, errorCorrection } = input;
  
  // Using QR Server API for generating QR codes
  const encodedText = encodeURIComponent(text);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedText}&ecc=${errorCorrection}`;
  const downloadUrl = `${qrCodeUrl}&download=1`;

  return {
    qrCodeUrl,
    downloadUrl,
    size,
    errorCorrection,
  };
}