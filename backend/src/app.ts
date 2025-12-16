import express from 'express';
import cors from 'cors';
import bookingsRouter from './routes/bookings';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
// Routes
app.get('/health', (req, res) => {
    res.status(200).json({ ok: true });
});

app.use('/', bookingsRouter);

export default app;
