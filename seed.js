import client from './db.js';

async function init() {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL
      );
    `);
    console.log('✅ تم إنشاء الجدول بنجاح!');
  } catch (error) {
    console.error('❌ فشل في إنشاء الجدول:', error);
  }
}

init();