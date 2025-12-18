import express from 'express';
import Database from 'better-sqlite3';
import { join } from 'path';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
const dbPath = join(process.cwd(), process.env.DB_PATH || 'bookings.db');
const db = new Database(dbPath);

// Get all bookings
router.get('/', (req, res) => {
    const bookings = db.prepare('SELECT * FROM bookings').all();
    res.json({ bookings });
});

// Reserve a booking
router.post('/:id/reserve', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const { idempotencyKey } = req.body;
    const userId = req.session.userId;

    // Validate ID
    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Validate idempotency key
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
        return res.status(400).json({ success: false, message: 'Idempotency key is required' });
    }

    try {
        const update = db.prepare(`
            UPDATE bookings 
            SET availability = 0, idempotency_key = ?, user_id = ?
            WHERE id = ? AND availability = 1
        `);

        const result = update.run(idempotencyKey, userId, id);

        if (result.changes > 0) {
            res.json({ success: true, message: 'Booking reserved' });
        } else {
            // Check if it was already taken by someone else or just idempotency match
            const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;

            if (!booking) {
                return res.status(404).json({ success: false, message: 'Booking not found' });
            }

            if (booking.idempotency_key === idempotencyKey && booking.user_id === userId) {
                return res.json({ success: true, message: 'Booking already reserved by you' });
            }
            res.status(400).json({ success: false, message: 'Booking unavailable' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
