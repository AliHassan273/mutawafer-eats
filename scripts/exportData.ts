import fs from 'node:fs/promises';
import path from 'node:path';
import { admins, users, restaurants, orders, reviews, settings, initDB } from '../src/db.ts';

await initDB();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = process.env.BACKUP_DIR || path.resolve(process.cwd(), 'backups');
await fs.mkdir(outputDir, { recursive: true });
const backup = {
  exportedAt: new Date().toISOString(),
  admins: (await admins.all()).map(({ password, ...safe }: any) => safe),
  users: await users.all(),
  restaurants: await restaurants.all(),
  orders: await orders.all(),
  reviews: await reviews.all(),
  settings: await settings.all(),
};
const file = path.join(outputDir, `backup-${stamp}.json`);
await fs.writeFile(file, JSON.stringify(backup, null, 2), 'utf8');
console.log(`Backup exported: ${file}`);
