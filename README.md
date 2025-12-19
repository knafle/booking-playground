# Booking Playground Monorepo

A minimal monorepo setup with Vite+React frontend and Node+Express+TypeScript backend. Now features user authentication, persistent sessions, and protected booking actions.

## Features

- **Authentication**: User registration and login using email/password (bcrypt hashed).
- **Sessions**: Persistent session management using SQLite (`connect-sqlite3`).
- **Protected Bookings**: Only authenticated users can reserve bookings.
- **Input Validation**: Backend and frontend validation for email format and password length.
- **Ownership Tracking**: Users can identify bookings they reserved ("Reserved by you").
- **Cancellation**: Authenticated users can cancel their own reservations with idempotency support.
- **UI Improvements**: Responsive layout with header (login), footer (status), and action buttons.
- **Testing**: Atomic backend integration tests (reservation, cancellation, race conditions) and frontend optimistic UI tests.
- **CI/CD**: Automated test execution via GitHub Actions on every push/PR.
- **Real-time Updates**: Instant synchronization across clients using **Socket.IO**.
- **Resilient Connectivity**: Custom fallback to 30s polling when the WebSocket connection is lost.

## Project Structure

```
booking-playground/
├── frontend/          # Vite + React application
├── backend/           # Node + Express + TypeScript server
│   ├── src/           # Source code (routes, db, services)
│   ├── dist/          # Compiled JavaScript
│   ├── bookings.db    # Main application database
│   ├── sessions.db    # Session store
│   └── verify-auth.js # Verification script
└── README.md
```

## Prerequisites

- Node.js (v18 or higher recommended)
- npm

## Setup Instructions

### 1. Install Frontend Dependencies

```bash
cd frontend
npm install
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

## Running the Application

### Start Backend (Terminal 1)

The backend uses TypeScript and `ts-node` for development.

```bash
cd backend
npm run dev
```

Backend will run on `http://localhost:3001`.

**Note**: The server will automatically run migrations (`src/db/migrate.ts`) on startup if tables don't exist.

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:5173`.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create a new user (Body: `{ email, password }`)
- `POST /api/auth/login` - Login (Body: `{ email, password }`)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user info

### Bookings
- `GET /api/bookings` - Get all bookings (includes `user_id` if reserved)
- `POST /api/bookings/:id/reserve` - Reserve a specific booking slot **(Requires Auth)**
  - Body: `{ "idempotencyKey": "uuid-string" }`
- `POST /api/bookings/:id/cancel` - Cancel a specific reservation **(Requires Owner Auth)**
  - Body: `{ "idempotencyKey": "uuid-string" }`
- **Real-time Synchronization** (WebSocket):
  - Emits `booking_reserved` on successful reservation.
  - Emits `booking_canceled` on successful cancellation.

## Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **Context API** - State management (AuthContext)

### Backend
- **Node.js** - Runtime
- **TypeScript** - Language
- **Express** - Web framework
- **better-sqlite3** - SQLite database driver
- **express-session** & **connect-sqlite3** - Session storage
- **bcrypt** - Password hashing
- **express-validator**: Input validation
- **CORS**: Cross-origin resource sharing
- **Socket.IO**: Real-time bidirectional event-based communication

## Testing

### Backend Tests
Integration tests for the backend verify idempotency, race condition handling, double booking prevention, and ownership-based cancellation. Tests are atomic, independent, and restore state before each run.

```bash
cd backend
npm test
```

### Frontend Tests
Frontend tests verify the optimistic UI behavior and rollback mechanism.

```bash
cd frontend
npm test
```

## CI/CD

This project uses **GitHub Actions** to automatically run the full test suite when changes are pushed to `main` or `master` branches. The configuration can be found in `.github/workflows/test.yml`.

## Verification

To verify the authentication flow programmatically:

```bash
cd backend
node verify-auth.js
```
