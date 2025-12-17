# Booking Playground Monorepo

A minimal monorepo setup with Vite+React frontend and Node+Express+TypeScript backend.

## Project Structure

```
booking-playground/
├── frontend/          # Vite + React application
├── backend/           # Node + Express + TypeScript server
│   ├── src/           # Source code (routes, db, services)
│   ├── dist/          # Compiled JavaScript
│   └── bookings.db    # SQLite database
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

Backend will run on `http://localhost:3001`

To build for production:
```bash
npm run build
npm start
```

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:5173` (Vite default port)

## API Endpoints

- `GET /health` - Health check (Returns 200 OK)
- `GET /api/bookings` - Get all bookings
- `POST /api/bookings/:id/reserve` - Reserve a specific booking slot
  - Body: `{ "idempotencyKey": "uuid-string" }`

## Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server

### Backend
- **Node.js** - Runtime
- **TypeScript** - Language
- **Express** - Web framework
- **better-sqlite3** - SQLite database driver
- **CORS** - Cross-origin resource sharing

## Next Steps

- Add booking functionality (Implemented)
- Create booking form in frontend (Implemented)
- Add data persistence (Implemented via SQLite)
