// using global fetch

// Note: using built-in fetch if available (Node 18+) or this script might need revision if running on older node without installation.
// Assuming Node 18+ for this environment which has global fetch.

const BASE_URL = 'http://localhost:3001/api';
let cookie = '';

async function request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (cookie) headers['Cookie'] = cookie;

    const options = {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
    };

    const res = await fetch(`${BASE_URL}${path}`, options);

    // Capture cookie
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
        cookie = setCookie.split(';')[0];
    }

    const data = await res.json();
    return { status: res.status, data };
}

async function run() {
    const email = `test-${Date.now()}@example.com`;
    const password = 'password123';

    console.log('1. Registering new user:', email);
    const reg = await request('POST', '/auth/register', { email, password });
    console.log('   Status:', reg.status, reg.data);

    if (!reg.data.success) {
        if (reg.data.message === 'Email already exists') {
            console.log('   Email exists, trying login...');
        } else {
            console.error('   Registration failed');
            return;
        }
    }

    console.log('\n2. Logging in...');
    const login = await request('POST', '/auth/login', { email, password });
    console.log('   Status:', login.status, login.data);

    console.log('\n3. Checking /me...');
    const me = await request('GET', '/auth/me');
    console.log('   Status:', me.status, me.data);
    if (!me.data.success) console.error('   Failed to get me');

    // Get a booking
    const bookingsRes = await fetch('http://localhost:3001/api/bookings');
    const bookingsData = await bookingsRes.json();
    const availableBooking = bookingsData.bookings.find(b => b.availability);

    if (availableBooking) {
        console.log(`\n4. Reserving booking ${availableBooking.id}...`);
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        const reserve = await request('POST', `/bookings/${availableBooking.id}/reserve`, { idempotencyKey: uuid });
        console.log('   Status:', reserve.status, reserve.data);
    } else {
        console.log('\n4. No available bookings to test reservation.');
    }

    console.log('\n5. Logging out...');
    const logout = await request('POST', '/auth/logout');
    console.log('   Status:', logout.status, logout.data);

    console.log('\n6. Checking /me (should fail)...');
    const me2 = await request('GET', '/auth/me');
    console.log('   Status:', me2.status, me2.data.success ? 'Success' : 'Failed (Expected)');

}

run().catch(console.error);
