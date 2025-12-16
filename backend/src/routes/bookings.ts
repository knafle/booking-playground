import { Router, Request, Response } from 'express';
import { getAllBookings, reserveBooking } from '../db/database';

const router = Router();

router.get('/api/bookings', (req: Request, res: Response) => {
    const bookings = getAllBookings();
    res.status(200).json({ bookings });
});

router.post('/api/bookings/:id/reserve', (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { idempotencyKey } = req.body;

    // Validate ID
    if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid booking ID' });
        return;
    }

    // Validate idempotency key
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
        res.status(400).json({ success: false, message: 'Idempotency key is required' });
        return;
    }

    // Validate UUID format (basic check)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(idempotencyKey)) {
        res.status(400).json({ success: false, message: 'Invalid idempotency key format (must be UUID)' });
        return;
    }

    try {
        const result = reserveBooking(id, idempotencyKey);
        const statusCode = result.statusCode || 200;
        // The result object shouldn't contain statusCode in the body for the client
        const { statusCode: _, ...responseBody } = result;
        res.status(statusCode).json(responseBody);
    } catch (error) {
        console.error('Error processing reservation:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

export default router;
