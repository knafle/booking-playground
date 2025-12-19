import http from 'http';
import { Server } from 'socket.io';
import app from './app';

const PORT = 3001;
const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.set('io', io);

io.on('connection', (socket) => {
    console.log('a user connected');
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
