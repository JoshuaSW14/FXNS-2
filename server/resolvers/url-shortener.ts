import { z } from "zod";

export const urlShortenerInputSchema = z.object({
  url: z.string().url("Invalid URL format"),
  customSlug: z.string().optional(),
});

export const urlShortenerOutputSchema = z.object({
  originalUrl: z.string(),
  shortUrl: z.string(),
  qrCodeUrl: z.string(),
  slug: z.string(),
  expiresAt: z.string(),
});

export type UrlShortenerInput = z.infer<typeof urlShortenerInputSchema>;
export type UrlShortenerOutput = z.infer<typeof urlShortenerOutputSchema>;

export function urlShortener(input: UrlShortenerInput): UrlShortenerOutput {
  const { url, customSlug } = input;
  
  // Generate a random slug if none provided
  const slug = customSlug || Math.random().toString(36).substring(2, 8);
  
  // For demo purposes, using a mock short URL service
  // In production, you'd store this in your database
  const shortUrl = `https://fxns.app/${slug}`;
  
  // Generate QR code for the short URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortUrl)}`;
  
  // Set expiration to 30 days from now
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  return {
    originalUrl: url,
    shortUrl,
    qrCodeUrl,
    slug,
    expiresAt,
  };
}