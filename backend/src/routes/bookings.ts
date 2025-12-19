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
            const io = req.app.get('io');
            if (io) io.emit('booking_reserved', { id });
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

// Cancel a reservation
router.post('/:id/cancel', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    const { idempotencyKey } = req.body;
    const userId = req.session.userId;

    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid booking ID' });
    }

    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
        return res.status(400).json({ success: false, message: 'Idempotency key is required' });
    }

    try {
        // Find the booking first to check ownership and current idempotency key
        const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        // Idempotency check: if the key matches AND it's already available, it's a successful "no-op"
        if (booking.idempotency_key === idempotencyKey && booking.availability === 1) {
            return res.json({ success: true, message: 'Reservation already cancelled' });
        }

        // Ownership check
        if (booking.user_id !== userId) {
            return res.status(403).json({ success: false, message: 'You do not own this reservation' });
        }

        // Perform the cancellation
        const update = db.prepare(`
            UPDATE bookings 
            SET availability = 1, idempotency_key = ?, user_id = NULL
            WHERE id = ? AND user_id = ? AND availability = 0
        `);

        const result = update.run(idempotencyKey, id, userId);

        if (result.changes > 0) {
            const io = req.app.get('io');
            if (io) io.emit('booking_canceled', { id });
            res.json({ success: true, message: 'Reservation cancelled' });
        } else {
            // Re-check the state in case of race conditions
            const currentBooking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id) as any;
            if (currentBooking.idempotency_key === idempotencyKey && currentBooking.availability === 1) {
                return res.json({ success: true, message: 'Reservation cancelled (idempotent)' });
            }
            res.status(400).json({ success: false, message: 'Could not cancel reservation' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
