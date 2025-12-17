const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'bookings.db');
const db = new Database(dbPath);

const stmt = db.prepare('UPDATE bookings SET availability = 1, idempotency_key = NULL, user_id = NULL');
const info = stmt.run();

console.log(`Reset ${info.changes} bookings to available.`);
