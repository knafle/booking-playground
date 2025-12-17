/// <reference path="./express-session.d.ts" />
import express from 'express';
import cors from 'cors';
import session, { Store } from 'express-session';
import sqlite3 from 'connect-sqlite3';
import bookingsRouter from './routes/bookings';
import authRouter from './routes/auth';

const app = express();
const SQLiteStore = sqlite3(session);

// Middleware
app.use(cors({
    origin: 'http://localhost:5173', // Adjust if frontend port differs
    credentials: true
}));
app.use(express.json());

// Session
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.db',
        dir: process.cwd(), // Database directory
    }) as unknown as Store,
    secret: 'your_secret_key', // In production, use env var
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set true if using https
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    }
}));

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingsRouter);

export default app;
