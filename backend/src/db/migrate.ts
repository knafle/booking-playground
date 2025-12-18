import Database from 'better-sqlite3';
import { join } from 'path';
import fs from 'fs';

const dbPath = join(process.cwd(), process.env.DB_PATH || 'bookings.db');
const db = new Database(dbPath);

export const migrate = () => {
    console.log('Running migrations...');

    // Create users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create bookings table
    db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        time TEXT NOT NULL UNIQUE,
        availability BOOLEAN NOT NULL DEFAULT 1,
        idempotency_key TEXT UNIQUE,
        user_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Add user_id column if it doesn't exist (migrations for existing db)
    try {
        db.prepare('ALTER TABLE bookings ADD COLUMN user_id INTEGER REFERENCES users(id)').run();
    } catch (error: any) {
        // Ignore if column already exists
        if (!error.message.includes('duplicate column name')) {
            console.log('Note: user_id column check:', error.message);
        }
    }

    // Check if we need to seed data
    const count = db.prepare('SELECT COUNT(*) as count FROM bookings').get() as { count: number };

    if (count.count === 0) {
        console.log('Seeding initial data...');
        const seedDataPath = join(__dirname, 'seedData.json');

        if (fs.existsSync(seedDataPath)) {
            const seedDataRaw = fs.readFileSync(seedDataPath, 'utf-8');
            const seedData = JSON.parse(seedDataRaw);

            const insert = db.prepare('INSERT INTO bookings (time, availability) VALUES (?, ?)');

            const runTransaction = db.transaction((data: any[]) => {
                for (const item of data) {
                    insert.run(item.time, item.availability ? 1 : 0);
                }
            });

            runTransaction(seedData);
            console.log('Database seeded with initial bookings');
        } else {
            console.warn('Seed data file not found:', seedDataPath);
        }
    } else {
        console.log('Database already contains data, skipping seed.');
    }

    console.log('Migration completed.');
};

// Allow running directly
if (require.main === module) {
    migrate();
}
