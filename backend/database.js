import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'bookings.db'));

// Create bookings table with idempotency_key column
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT NOT NULL UNIQUE,
    availability BOOLEAN NOT NULL DEFAULT 1,
    idempotency_key TEXT UNIQUE
  )
`);

// Check if we need to seed data
const count = db.prepare('SELECT COUNT(*) as count FROM bookings').get();

if (count.count === 0) {
    // Seed initial data
    const insert = db.prepare('INSERT INTO bookings (time, availability) VALUES (?, ?)');

    const seedData = [
        ['09:00 AM', true],
        ['10:00 AM', true],
        ['11:00 AM', false],
        ['01:00 PM', true],
        ['02:00 PM', false],
        ['03:00 PM', true],
    ];

    for (const [time, availability] of seedData) {
        insert.run(time, availability ? 1 : 0);
    }

    console.log('Database seeded with initial bookings');
}

// Database queries
export const getAllBookings = () => {
    const bookings = db.prepare('SELECT * FROM bookings ORDER BY id').all();
    return bookings.map(b => ({ ...b, availability: Boolean(b.availability) }));
};

export const getBookingById = (id) => {
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (booking) {
        booking.availability = Boolean(booking.availability);
    }
    return booking;
};

export const reserveBooking = (id, idempotencyKey) => {
    // Check if this idempotency key has already been used
    const existingBooking = db.prepare('SELECT * FROM bookings WHERE idempotency_key = ?').get(idempotencyKey);

    if (existingBooking) {
        // This idempotency key was already used
        if (existingBooking.id === id) {
            // Same booking, return success (idempotent response)
            return {
                success: true,
                message: 'Booking reserved successfully',
                booking: {
                    ...existingBooking,
                    availability: Boolean(existingBooking.availability)
                },
                statusCode: 200
            };
        } else {
            // Different booking attempted with same key - this is an error
            return {
                success: false,
                message: 'Idempotency key already used for a different booking',
                statusCode: 409
            };
        }
    }

    // Use a transaction to ensure atomicity
    const transaction = db.transaction(() => {
        // Get the booking
        const booking = getBookingById(id);

        if (!booking) {
            return { success: false, message: 'Booking not found', statusCode: 404 };
        }

        if (!booking.availability) {
            return { success: false, message: 'Booking already reserved', statusCode: 409 };
        }

        // Atomic operation: only update if availability is 1 (true)
        // Also set the idempotency key
        const result = db.prepare(
            'UPDATE bookings SET availability = 0, idempotency_key = ? WHERE id = ? AND availability = 1'
        ).run(idempotencyKey, id);

        // Return result based on whether the update succeeded
        if (result.changes === 1) {
            return {
                success: true,
                message: 'Booking reserved successfully',
                booking: { ...booking, availability: false, idempotency_key: idempotencyKey },
                statusCode: 200
            };
        } else {
            return { success: false, message: 'Booking already reserved', statusCode: 409 };
        }
    });

    return transaction();
};

export default db;
