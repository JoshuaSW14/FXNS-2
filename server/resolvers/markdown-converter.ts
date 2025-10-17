import { z } from "zod";

export const markdownConverterInputSchema = z.object({
  markdown: z.string(),
});

export const markdownConverterOutputSchema = z.object({
  html: z.string(),
  plainText: z.string(),
  wordCount: z.number(),
  characterCount: z.number(),
});

export type MarkdownConverterInput = z.infer<typeof markdownConverterInputSchema>;
export type MarkdownConverterOutput = z.infer<typeof markdownConverterOutputSchema>;

function sanitizeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    return '#';
  }
  return url;
}

export function markdownConverterResolver(input: MarkdownConverterInput): MarkdownConverterOutput {
  const { markdown } = input;

  const sanitized = sanitizeHtml(markdown);

  const lines = sanitized.split('\n');
  const processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    if (/^### /.test(line)) {
      processedLines.push(line.replace(/^### (.*)$/, '<h3>$1</h3>'));
    } else if (/^## /.test(line)) {
      processedLines.push(line.replace(/^## (.*)$/, '<h2>$1</h2>'));
    } else if (/^# /.test(line)) {
      processedLines.push(line.replace(/^# (.*)$/, '<h1>$1</h1>'));
    } else if (/^[\*\-] /.test(line)) {
      if (i === 0 || !(/^[\*\-] /.test(lines[i - 1]))) {
        processedLines.push('<ul>');
      }
      processedLines.push(line.replace(/^[\*\-] (.+)$/, '<li>$1</li>'));
      if (i === lines.length - 1 || !(/^[\*\-] /.test(lines[i + 1]))) {
        processedLines.push('</ul>');
      }
    } else if (/^\d+\. /.test(line)) {
      if (i === 0 || !(/^\d+\. /.test(lines[i - 1]))) {
        processedLines.push('<ol>');
      }
      processedLines.push(line.replace(/^\d+\. (.+)$/, '<li>$1</li>'));
      if (i === lines.length - 1 || !(/^\d+\. /.test(lines[i + 1]))) {
        processedLines.push('</ol>');
      }
    } else if (/^&gt; /.test(line)) {
      processedLines.push(line.replace(/^&gt; (.+)$/, '<blockquote>$1</blockquote>'));
    } else if (/^\-\-\-$/.test(line)) {
      processedLines.push('<hr />');
    } else {
      processedLines.push(line);
    }
  }
  
  let html = processedLines.join('\n')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  const blockSeparated = html.replace(/(<\/?(ul|ol|h[1-3]|blockquote|hr)[^>]*>)/g, '\n\n$1');
  
  const chunks = blockSeparated.split(/\n\n+/);
  html = chunks
    .map(chunk => {
      chunk = chunk.trim();
      if (!chunk) return '';
      if (chunk.startsWith('<h') || chunk.startsWith('<ul') || chunk.startsWith('<ol') || 
          chunk.startsWith('</ul') || chunk.startsWith('</ol') || 
          chunk.startsWith('<blockquote') || chunk.startsWith('<hr')) {
        return chunk;
      }
      return `<p>${chunk.replace(/\n/g, '<br />')}</p>`;
    })
    .filter(chunk => chunk)
    .join('\n');

  const plainText = markdown
    .replace(/[#*_~`[\]()]/g, '')
    .replace(/!\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .trim();

  const wordCount = plainText.split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = plainText.length;

  return {
    html,
    plainText,
    wordCount,
    characterCount,
  };
}
