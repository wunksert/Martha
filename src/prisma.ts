import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbUrl = process.env.DATABASE_URL || 
  `file:${path.join(__dirname, '..', 'prisma', 'dev.db')}`;

const adapter = new PrismaBetterSQLite3({
  url: dbUrl
});

const prisma = new PrismaClient({ adapter });

export default prisma;

