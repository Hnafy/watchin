# StreamHub - Streaming Platform

A modern full-stack streaming platform for movies, TV shows, and cartoons.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand
- **Backend:** Node.js, Express, TypeScript, Mongoose (MongoDB ODM)
- **Database:** MongoDB 7, Redis 7
- **Auth:** JWT (httpOnly cookies with refresh token rotation)
- **Media Player:** HTML5 Video with HLS support

## Quick Start

### Prerequisites
- Node.js 20+
- Docker (for MongoDB & Redis)

### Setup

```bash
# 1. Start databases
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Set up database (seed sample data + admin/demo users)
npm run db:seed

# 4. Start dev servers
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000

## Features

- Browse Movies, TV Shows, Cartoons
- User Authentication (JWT)
- Custom Video Player (HLS/DASH)
- 5-star Rating & Reviews
- Watchlist
- Search & Filtering
- Trending & Top-Rated carousels
- Admin Dashboard (CRUD)
- Responsive design with dark mode

## Project Structure

```
streaming-platform/
├── client/          # React frontend
│   └── src/
│       ├── components/   # Reusable UI
│       ├── pages/        # Page components
│       ├── hooks/        # Custom hooks
│       ├── store/        # Zustand stores
│       ├── services/     # API services
│       └── types/        # TypeScript types
├── server/          # Express backend
│   └── src/
│       ├── db/           # Mongoose models & connection
│       ├── config/       # Configuration
│       ├── controllers/  # Route handlers
│       ├── middleware/   # Express middleware
│       ├── routes/       # API routes
│       └── services/     # Business logic
└── docker-compose.yml
```

## Environment Variables

Copy `server/.env.example` to `server/.env` and configure:

```env
MONGODB_URI="mongodb://localhost:27017/streaming"
JWT_ACCESS_SECRET="your-secret-key-min-64-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-64-chars"
CLIENT_URL="http://localhost:5173"
```

## License

MIT# watchin
