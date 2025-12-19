const TEST_DB = 'test_bookings.db';
process.env.DB_PATH = TEST_DB;

import request from 'supertest';
import app from '../app';
import Database from 'better-sqlite3';
import { join } from 'path';
import fs from 'fs';
import { migrate } from '../db/migrate';

describe('Reservation Integration Tests', () => {
    let db: Database.Database;

    beforeAll(() => {
        // Run migrations once on test db
        migrate();
        db = new Database(join(process.cwd(), TEST_DB));
    });

    beforeEach(() => {
        // Restore DB state before each test
        // 1. Clear reservations
        db.prepare('UPDATE bookings SET user_id = NULL, idempotency_key = NULL, availability = 1').run();
        // 2. Clear users
        db.prepare('DELETE FROM users').run();
        // 3. Reset internal sqlite sequence for IDs if needed (not strictly necessary but cleaner)
        db.prepare("DELETE FROM sqlite_sequence WHERE name='users'").run();
        // and for bookings if we were deleting them, but we are just updating them.
    });

    afterAll(() => {
        if (db) db.close();
        if (fs.existsSync(join(process.cwd(), TEST_DB))) {
            try {
                fs.unlinkSync(join(process.cwd(), TEST_DB));
            } catch (e) {
                // Ignore busy errors on teardown
            }
        }
    });

    const registerUser = async (email: string) => {
        return request(app)
            .post('/api/auth/register')
            .send({ email, password: 'password123' });
    };

    const loginUser = async (email: string) => {
        const agent = request.agent(app);
        await agent
            .post('/api/auth/login')
            .send({ email, password: 'password123' });
        return agent;
    };

    it('should allow a user to reserve a booking with an idempotency key', async () => {
        const email = 'user1@example.com';
        await registerUser(email);
        const agent = await loginUser(email);

        const res = await agent
            .post('/api/bookings/1/reserve')
            .send({ idempotencyKey: 'key1' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Booking reserved');

        const booking = db.prepare('SELECT * FROM bookings WHERE id = 1').get() as any;
        expect(booking.availability).toBe(0);
        expect(booking.idempotency_key).toBe('key1');
    });

    it('should be idempotent (multiple requests with same key)', async () => {
        const email = 'user2@example.com';
        await registerUser(email);
        const agent = await loginUser(email);

        // First request
        await agent
            .post('/api/bookings/2/reserve')
            .send({ idempotencyKey: 'key2' });

        // Second request with same key
        const res = await agent
            .post('/api/bookings/2/reserve')
            .send({ idempotencyKey: 'key2' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Booking already reserved by you');
    });

    it('should handle simultaneous requests for the same slot (race condition)', async () => {
        const email3 = 'user3@example.com';
        const email4 = 'user4@example.com';
        await registerUser(email3);
        await registerUser(email4);
        const agent3 = await loginUser(email3);
        const agent4 = await loginUser(email4);

        // Send two requests simultaneously
        const [res3, res4] = await Promise.all([
            agent3.post('/api/bookings/3/reserve').send({ idempotencyKey: 'key3' }),
            agent4.post('/api/bookings/3/reserve').send({ idempotencyKey: 'key4' })
        ]);

        // One should succeed, one should fail
        const successCount = [res3, res4].filter(r => r.body.success).length;
        const failedCount = [res3, res4].filter(r => !r.body.success).length;

        expect(successCount).toBe(1);
        expect(failedCount).toBe(1);

        const failedRes = res3.body.success ? res4 : res3;
        expect(failedRes.status).toBe(400);
        expect(failedRes.body.message).toBe('Booking unavailable');
    });

    it('should not allow double booking after retry with different key', async () => {
        const email5 = 'user5@example.com';
        await registerUser(email5);
        const agent = await loginUser(email5);

        // Create another user to own the booking
        const otherEmail = 'other@example.com';
        const regRes = await registerUser(otherEmail);
        const otherUserId = regRes.body.user.id;

        // Someone else already took it (simulated)
        db.prepare(`UPDATE bookings SET availability = 0, user_id = ${otherUserId}, idempotency_key = 'other' WHERE id = 4`).run();

        const res = await agent
            .post('/api/bookings/4/reserve')
            .send({ idempotencyKey: 'key5' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe('Booking unavailable');
    });

    it('should allow retry with same idempotency key if previous failed but now session is same', async () => {
        const email6 = 'user6@example.com';
        await registerUser(email6);
        const agent = await loginUser(email6);

        // Reserve
        await agent.post('/api/bookings/6/reserve').send({ idempotencyKey: 'key6' });

        // Retry with same key
        const res = await agent.post('/api/bookings/6/reserve').send({ idempotencyKey: 'key6' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Booking already reserved by you');
    });

    describe('Cancellation tests', () => {
        it('should allow a user to cancel their own reservation', async () => {
            const email = 'cancel_success@example.com';
            await registerUser(email);
            const agent = await loginUser(email);

            // Reserve first
            await agent.post('/api/bookings/7/reserve').send({ idempotencyKey: 'res_key_7' });

            // Cancel
            const res = await agent
                .post('/api/bookings/7/cancel')
                .send({ idempotencyKey: 'cancel_key_7' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Reservation cancelled');

            const booking = db.prepare('SELECT * FROM bookings WHERE id = 7').get() as any;
            expect(booking.availability).toBe(1);
            expect(booking.user_id).toBeNull();
        });

        it('should be idempotent (multiple cancel requests with same key)', async () => {
            const email = 'cancel_idemp@example.com';
            await registerUser(email);
            const agent = await loginUser(email);

            await agent.post('/api/bookings/8/reserve').send({ idempotencyKey: 'res_key_8' });

            // First cancel
            await agent.post('/api/bookings/8/cancel').send({ idempotencyKey: 'cancel_idemp_8' });

            // Second cancel with same key
            const res = await agent.post('/api/bookings/8/cancel').send({ idempotencyKey: 'cancel_idemp_8' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Reservation already cancelled');
        });

        it('should not allow a user to cancel someone else reservation', async () => {
            const ownerEmail = 'owner@example.com';
            const hackerEmail = 'hacker@example.com';

            await registerUser(ownerEmail);
            await registerUser(hackerEmail);

            const ownerAgent = await loginUser(ownerEmail);
            const hackerAgent = await loginUser(hackerEmail);

            // Owner reserves
            await ownerAgent.post('/api/bookings/9/reserve').send({ idempotencyKey: 'res_key_9' });

            // Hacker tries to cancel
            const res = await hackerAgent
                .post('/api/bookings/9/cancel')
                .send({ idempotencyKey: 'hacker_key_9' });

            expect(res.status).toBe(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('You do not own this reservation');

            const booking = db.prepare('SELECT * FROM bookings WHERE id = 9').get() as any;
            expect(booking.availability).toBe(0); // Still reserved
        });

        it('should return 404 for cancelling a non-existent booking', async () => {
            const email = 'test_404@example.com';
            await registerUser(email);
            const agent = await loginUser(email);

            const res = await agent
                .post('/api/bookings/999/cancel')
                .send({ idempotencyKey: 'key_999' });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Booking not found');
        });
    });
});
