import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const projectRoot = join(__dirname, '../..');

export function logEndpoint(method: string, path: string, startTime: number, status?: number, error?: Error) {
  const duration = Date.now() - startTime;
  const timestamp = new Date().toISOString();
  
  if (error) {
    console.log(`[${timestamp}] ${method} ${path} - ERROR (${duration}ms):`, error.message);
  } else {
    console.log(`[${timestamp}] ${method} ${path} - ${status || 200} (${duration}ms)`);
  }
}

export function logToolCall(toolName: string, input: any, startTime: number, success: boolean, error?: Error) {
  const duration = Date.now() - startTime;
  const timestamp = new Date().toISOString();
  
  // Sanitize input for logging (remove sensitive data if needed)
  const sanitizedInput = { ...input };
  if (sanitizedInput.email) {
    sanitizedInput.email = sanitizedInput.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  }
  
  if (error) {
    console.log(`[${timestamp}] TOOL ${toolName} - ERROR (${duration}ms):`, error.message);
    console.log(`  Input:`, JSON.stringify(sanitizedInput));
  } else {
    console.log(`[${timestamp}] TOOL ${toolName} - SUCCESS (${duration}ms)`);
    console.log(`  Input:`, JSON.stringify(sanitizedInput));
  }
}

/**
 * Reads HTML file from dist in production, or ui in development
 */
export function readHtmlFile(filename: string): string {
    const isProduction = process.env.NODE_ENV === 'production';
    const distPath = join(projectRoot, 'dist/ui', filename);
    const devPath = join(projectRoot, 'ui', filename);
    
    // In production, prefer dist. In dev, prefer ui but fallback to dist if ui doesn't exist
    if (isProduction) {
        if (existsSync(distPath)) {
            return readFileSync(distPath, 'utf-8');
        }
        throw new Error(`Production file not found: ${distPath}`);
    } else {
        // Dev: try ui first, then dist as fallback
        if (existsSync(devPath)) {
            return readFileSync(devPath, 'utf-8');
        }
        if (existsSync(distPath)) {
            return readFileSync(distPath, 'utf-8');
        }
        throw new Error(`File not found in dev or dist: ${devPath} or ${distPath}`);
    }
}

