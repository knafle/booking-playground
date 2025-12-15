# Booking Playground Monorepo

A minimal monorepo setup with Vite+React frontend and Node+Express backend.

## Project Structure

```
booking-playground/
├── frontend/          # Vite + React application
├── backend/           # Node + Express server
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

```bash
cd backend
npm run dev
```

Backend will run on `http://localhost:3001`

### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:5173` (Vite default port)

## API Endpoints

- `GET /api/health` - Health check endpoint
- `GET /api/bookings` - Get bookings (returns empty array for now)

## Tech Stack

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **CORS** - Cross-origin resource sharing

## Next Steps

- Add booking functionality
- Create booking form in frontend
- Add data persistence (if needed)
