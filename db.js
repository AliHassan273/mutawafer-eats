import { createClient } from '@libsql/client';
import 'dotenv/config'; // تأكد من تثبيت حزمة dotenv: npm install dotenv

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default client;