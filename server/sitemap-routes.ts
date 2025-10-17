import { Router } from 'express';
import { db } from './db';
import { fxns } from '../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = process.env.VITE_APP_URL || 'https://www.fxns.ca';
    
    const staticPages: Array<{ url: string; changefreq: string; priority: string; lastmod?: string }> = [
      { url: '/', changefreq: 'daily', priority: '1.0' },
      { url: '/explore', changefreq: 'daily', priority: '0.9' },
      { url: '/auth', changefreq: 'monthly', priority: '0.5' },
    ];

    const approvedTools = await db
      .select({
        id: fxns.id,
        slug: fxns.slug,
        updatedAt: fxns.updatedAt,
      })
      .from(fxns)
      .where(eq(fxns.moderationStatus, 'approved'));

    const toolPages: Array<{ url: string; changefreq: string; priority: string; lastmod?: string }> = approvedTools.map(tool => ({
      url: `/fxn/${tool.slug || tool.id}`,
      changefreq: 'weekly',
      priority: '0.8',
      lastmod: tool.updatedAt?.toISOString().split('T')[0],
    }));

    const allPages = [...staticPages, ...toolPages];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
});

router.get('/robots.txt', (req, res) => {
  const baseUrl = process.env.VITE_APP_URL || 'https://www.fxns.ca';
  
  const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Sitemaps
Sitemap: ${baseUrl}/sitemap.xml`;

  res.header('Content-Type', 'text/plain');
  res.send(robotsTxt);
});

export default router;
