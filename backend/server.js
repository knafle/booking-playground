import express from 'express';
import cors from 'cors';
import { getAllBookings, reserveBooking } from './database.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
    res.json({ ok: true });
});

app.get('/api/bookings', (req, res) => {
    const bookings = getAllBookings();
    res.json({ bookings });
});

app.post('/reserve', (req, res) => {
    const { id, idempotencyKey } = req.body;

    // Validate idempotency key
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
        return res.status(400).json({ success: false, message: 'Idempotency key is required' });
    }

    // Validate UUID format (basic check)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(idempotencyKey)) {
        return res.status(400).json({ success: false, message: 'Invalid idempotency key format (must be UUID)' });
    }

    try {
        const result = reserveBooking(id, idempotencyKey);
        const statusCode = result.statusCode || 200;
        delete result.statusCode; // Remove statusCode from response body
        res.status(statusCode).json(result);
    } catch (error) {
        console.error('Error processing reservation:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
