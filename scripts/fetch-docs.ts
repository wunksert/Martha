#!/usr/bin/env tsx

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOCS_BASE_URL = 'https://openai.github.io/apps-sdk-ui';
const OUTPUT_DIR = join(__dirname, '../docs/apps-sdk-ui');

interface NavItem {
  title: string;
  path: string;
  children?: NavItem[];
}

async function fetchPage(url: string): Promise<string> {
  console.log(`Fetching ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

async function extractNavigationFromIndex(): Promise<Array<{ path: string; title: string; id: string }>> {
  const navItems: Array<{ path: string; title: string; id: string }> = [];
  
  try {
    // Fetch Storybook's index.json which contains all stories and docs
    const indexUrl = `${DOCS_BASE_URL}/index.json`;
    console.log(`Fetching navigation index from ${indexUrl}...`);
    const response = await fetch(indexUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch index: ${response.status}`);
    }
    
    const indexData = await response.json();
    
    // Extract all docs entries
    if (indexData.entries) {
      Object.values(indexData.entries).forEach((entry: any) => {
        if (entry.type === 'docs' && entry.id) {
          // Convert id to path format: 
          // "docs-concepts-dark-mode--docs" -> "/docs/concepts-dark-mode--docs"
          // "overview-installation--docs" -> "/docs/overview-installation--docs"
          let path = entry.id;
          if (path.startsWith('docs-')) {
            path = path.replace(/^docs-/, '/docs/');
          } else if (path.endsWith('--docs')) {
            path = `/docs/${path}`;
          } else {
            path = `/docs/${path}`;
          }
          
          navItems.push({
            path,
            title: entry.title || entry.name || entry.id,
            id: entry.id
          });
        }
      });
    }
    
    // Sort by path to maintain structure
    navItems.sort((a, b) => a.path.localeCompare(b.path));
    
    return navItems;
  } catch (error) {
    console.warn(`Failed to fetch index.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

function extractPageContent(html: string): string {
  // Storybook renders content in an iframe - look for iframe src or content
  // The main content is usually in #storybook-preview-iframe or similar
  
  // First, try to find the iframe content URL
  const iframeMatch = html.match(/<iframe[^>]*id="storybook-preview-iframe"[^>]*src="([^"]*)"/i);
  
  // Also look for the root container where React renders
  const rootMatch = html.match(/<div[^>]*id="storybook-root"[^>]*>([\s\S]*?)<\/div>/i);
  
  // Try to find docs content in various containers
  const contentSelectors = [
    /<div[^>]*class="[^"]*docs-story[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*docs-page[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*sb-docs[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
  ];
  
  let content = '';
  
  // Try content selectors first
  for (const selector of contentSelectors) {
    const match = html.match(selector);
    if (match && match[1] && match[1].length > 100) {
      content = match[1];
      break;
    }
  }
  
  // If iframe found, note it (we can't fetch iframe content directly, but it's useful info)
  if (iframeMatch && !content) {
    console.log(`   ℹ️  Content is in iframe: ${iframeMatch[1]}`);
  }
  
  // If no specific container found, extract from body but exclude scripts/styles
  if (!content || content.length < 100) {
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch) {
      let bodyContent = bodyMatch[1];
      // Remove scripts and styles
      bodyContent = bodyContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
      bodyContent = bodyContent.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
      bodyContent = bodyContent.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
      content = bodyContent;
    } else {
      content = html;
    }
  }
  
  return parseHTMLToMarkdown(content);
}

function parseHTMLToMarkdown(html: string): string {
  let markdown = html;
  
  // Remove script and style tags first
  markdown = markdown.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  markdown = markdown.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  markdown = markdown.replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '');
  
  // Convert headings (preserve hierarchy)
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Convert code blocks (preserve before inline code)
  markdown = markdown.replace(/<pre[^>]*><code[^>]*class="[^"]*language-([^"]*)"[^>]*>(.*?)<\/code><\/pre>/gis, '```$1\n$2\n```\n\n');
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n');
  markdown = markdown.replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```\n\n');
  
  // Convert inline code (after blocks)
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');
  
  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Convert lists
  markdown = markdown.replace(/<ul[^>]*>/gi, '\n');
  markdown = markdown.replace(/<\/ul>/gi, '\n');
  markdown = markdown.replace(/<ol[^>]*>/gi, '\n');
  markdown = markdown.replace(/<\/ol>/gi, '\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  
  // Convert links (handle relative and absolute)
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, (match, href, text) => {
    const cleanText = text.trim();
    // If it's a Storybook internal link, convert to relative path
    if (href.includes('?path=')) {
      const pathMatch = href.match(/\?path=([^&]*)/);
      if (pathMatch) {
        return `[${cleanText}](${pathMatch[1]})`;
      }
    }
    return `[${cleanText}](${href})`;
  });
  
  // Convert images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
  markdown = markdown.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*>/gi, '![$1]($2)');
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*>/gi, '![]($1)');
  
  // Convert strong and emphasis
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');
  
  // Convert blockquotes
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n');
  
  // Convert tables
  markdown = markdown.replace(/<table[^>]*>/gi, '\n');
  markdown = markdown.replace(/<\/table>/gi, '\n\n');
  markdown = markdown.replace(/<thead[^>]*>/gi, '');
  markdown = markdown.replace(/<\/thead>/gi, '');
  markdown = markdown.replace(/<tbody[^>]*>/gi, '');
  markdown = markdown.replace(/<\/tbody>/gi, '');
  markdown = markdown.replace(/<tfoot[^>]*>/gi, '');
  markdown = markdown.replace(/<\/tfoot>/gi, '');
  
  // Process table rows
  const tableRows: string[] = [];
  const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowRegex.exec(markdown)) !== null) {
    const rowContent = rowMatch[1];
    const cells: string[] = [];
    const cellRegex = /<(th|td)[^>]*>(.*?)<\/\1>/gi;
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      cells.push(cellMatch[2].trim());
    }
    if (cells.length > 0) {
      tableRows.push('| ' + cells.join(' | ') + ' |');
    }
  }
  
  if (tableRows.length > 0) {
    // Replace table with markdown table
    const tableStart = markdown.indexOf('<table');
    const tableEnd = markdown.indexOf('</table>') + 8;
    if (tableStart !== -1 && tableEnd !== -1) {
      const headerRow = tableRows[0];
      const separator = '|' + ' --- |'.repeat(headerRow.split('|').length - 2) + ' |';
      const tableMarkdown = '\n' + headerRow + '\n' + separator + '\n' + tableRows.slice(1).join('\n') + '\n\n';
      markdown = markdown.slice(0, tableStart) + tableMarkdown + markdown.slice(tableEnd);
    }
  }
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]+>/g, '');
  
  // Decode HTML entities
  markdown = markdown.replace(/&nbsp;/g, ' ');
  markdown = markdown.replace(/&amp;/g, '&');
  markdown = markdown.replace(/&lt;/g, '<');
  markdown = markdown.replace(/&gt;/g, '>');
  markdown = markdown.replace(/&quot;/g, '"');
  markdown = markdown.replace(/&#39;/g, "'");
  markdown = markdown.replace(/&apos;/g, "'");
  markdown = markdown.replace(/&mdash;/g, '—');
  markdown = markdown.replace(/&ndash;/g, '–');
  markdown = markdown.replace(/&hellip;/g, '...');
  
  // Clean up extra whitespace
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  markdown = markdown.replace(/[ \t]+/g, ' ');
  markdown = markdown.replace(/^\s+|\s+$/gm, ''); // Trim each line
  markdown = markdown.trim();
  
  return markdown;
}

function sanitizeFilename(path: string): string {
  // Convert path to filename
  return path
    .replace(/^\//, '')
    .replace(/\//g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'index';
}

async function saveMarkdownFile(filepath: string, content: string, url: string): Promise<void> {
  const filename = sanitizeFilename(filepath) + '.md';
  const filePath = join(OUTPUT_DIR, filename);
  const fileDir = dirname(filePath);
  
  if (!existsSync(fileDir)) {
    await mkdir(fileDir, { recursive: true });
  }
  
  const fullContent = `# ${filepath.split('/').pop()?.replace(/-/g, ' ') || 'Documentation'}

> Source: [${url}](${url})
> Fetched: ${new Date().toISOString()}

---

${content}
`;
  
  await writeFile(filePath, fullContent, 'utf-8');
  console.log(`✅ Saved: ${filename}`);
}

async function fetchIframeContent(path: string): Promise<string> {
  // Storybook renders docs in an iframe
  // The iframe URL is typically: /iframe.html?id=<story-id>
  // For docs: /iframe.html?id=<docs-id>
  
  // Try different iframe URL patterns
  const iframeUrls = [
    `${DOCS_BASE_URL}/iframe.html?id=${path.replace(/^\//, '').replace(/\//g, '-')}`,
    `${DOCS_BASE_URL}/iframe.html?path=${path}`,
    `${DOCS_BASE_URL}${path}`,
  ];
  
  for (const iframeUrl of iframeUrls) {
    try {
      const html = await fetchPage(iframeUrl);
      const content = extractPageContent(html);
      if (content && content.length > 100) {
        return content;
      }
    } catch (e) {
      // Try next URL
      continue;
    }
  }
  
  return '';
}

async function fetchAllDocs() {
  try {
    // Extract navigation from index.json
    const navItems = await extractNavigationFromIndex();
    
    console.log(`\n📚 Found ${navItems.length} documentation pages`);
    
    if (navItems.length === 0) {
      console.log('⚠️  No documentation pages found. Using fallback paths...');
      // Fallback to common paths
      const commonDocs = [
        { path: '/docs/concepts-dark-mode--docs', id: 'docs-concepts-dark-mode--docs' },
        { path: '/docs/overview-installation--docs', id: 'docs-overview-installation--docs' },
        { path: '/docs/concepts-responsive-design--docs', id: 'docs-concepts-responsive-design--docs' },
      ];
      navItems.push(...commonDocs.map(item => ({
        ...item,
        title: item.path.split('/').pop()?.replace(/-/g, ' ') || 'Documentation'
      })));
    }
    
    console.log(`\n📥 Fetching ${navItems.length} documentation pages...\n`);
    
    for (const item of navItems) {
      try {
        const url = `${DOCS_BASE_URL}/?path=${item.path}`;
        console.log(`📄 [${navItems.indexOf(item) + 1}/${navItems.length}] ${item.title}`);
        
        // Fetch the iframe content directly (Storybook docs render in iframe)
        // Use the ID from index.json directly
        const iframeUrl = `${DOCS_BASE_URL}/iframe.html?id=${item.id}`;
        
        let content = '';
        try {
          const iframeHtml = await fetchPage(iframeUrl);
          content = extractPageContent(iframeHtml);
        } catch (e) {
          // If iframe fails, try the main page
          const html = await fetchPage(url);
          content = extractPageContent(html);
        }
        
        if (content && content.length > 100) {
          await saveMarkdownFile(item.path, content, url);
        } else {
          console.log(`   ⚠️  Content too short (${content.length} chars), skipping`);
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.log(`   ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log('\n✅ Documentation fetch complete!');
    console.log(`📁 Location: ${OUTPUT_DIR}`);
    
  } catch (error) {
    console.error('❌ Error fetching documentation:', error);
    process.exit(1);
  }
}

fetchAllDocs();

