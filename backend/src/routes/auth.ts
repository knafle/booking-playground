import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import { join } from 'path';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const dbPath = join(process.cwd(), 'bookings.db');
const db = new Database(dbPath);

// Register
router.post('/register', [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const insert = db.prepare('INSERT INTO users (email, password) VALUES (?, ?)');
        const result = insert.run(email, hashedPassword);

        // Auto login after register
        req.session.userId = result.lastInsertRowid as number;

        res.json({ success: true, user: { id: result.lastInsertRowid, email } });
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login
router.post('/login', [
    body('email').isEmail().withMessage('Invalid email format'),
    body('password').exists().withMessage('Password is required')
], async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        req.session.userId = user.id;
        res.json({ success: true, user: { id: user.id, email: user.email } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Could not log out' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true, message: 'Logged out' });
    });
});

// Me
router.get('/me', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Not logged in' });
    }

    const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.session.userId) as any;

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user });
});

export default router;
