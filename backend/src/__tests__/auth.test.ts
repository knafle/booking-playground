const TEST_DB = 'test_auth.db';
process.env.DB_PATH = TEST_DB;

import request from 'supertest';
import app from '../app';
import Database from 'better-sqlite3';
import { join } from 'path';
import fs from 'fs';
import { migrate } from '../db/migrate';

describe('Authentication Integration Tests', () => {
    let db: Database.Database;

    beforeAll(() => {
        migrate();
        db = new Database(join(process.cwd(), TEST_DB));
    });

    beforeEach(() => {
        db.prepare('DELETE FROM users').run();
        db.prepare("DELETE FROM sqlite_sequence WHERE name='users'").run();
    });

    afterAll(() => {
        if (db) db.close();
        if (fs.existsSync(join(process.cwd(), TEST_DB))) {
            try {
                fs.unlinkSync(join(process.cwd(), TEST_DB));
            } catch (e) {
                // Ignore busy errors
            }
        }
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user and auto-login', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'new@example.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.email).toBe('new@example.com');
            expect(res.header['set-cookie']).toBeDefined();
        });

        it('should fail if email already exists', async () => {
            await request(app)
                .post('/api/auth/register')
                .send({ email: 'duplicate@example.com', password: 'password123' });

            const res = await request(app)
                .post('/api/auth/register')
                .send({ email: 'duplicate@example.com', password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Email already exists');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            await request(app)
                .post('/api/auth/register')
                .send({ email: 'test@example.com', password: 'password123' });
        });

        it('should login successfully with correct credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'password123' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.user.email).toBe('test@example.com');
        });

        it('should fail with incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: 'wrongpassword' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials');
        });

        it('should fail with non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'nonexistent@example.com', password: 'password123' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Invalid credentials');
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should logout and clear session', async () => {
            const agent = request.agent(app);
            await agent
                .post('/api/auth/register')
                .send({ email: 'logout@example.com', password: 'password123' });

            const res = await agent.post('/api/auth/logout');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);

            // Verify session is cleared by checking /me
            const meRes = await agent.get('/api/auth/me');
            expect(meRes.status).toBe(401);
        });
    });
});
