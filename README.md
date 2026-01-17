# DishTracker

DishTracker is a mobile-first web application for tracking restaurant dishes and receipts. It allows users to capture photos of dishes and receipts, use AI-powered receipt parsing to extract itemized data, link dish photos to specific receipt line items, and rate dishes.

## Features

- **Receipt Capture & AI Parsing**: Upload receipt images and automatically extract restaurant details, date, and line items using OpenAI's GPT-4o-mini.
- **Dish Tracking**: Keep a record of dishes ordered, including prices and personal ratings.
- **Photo Linking**: Link photos of your dishes to the corresponding items on the receipt.
- **Mobile-First Design**: Optimized for mobile usage with a bottom navigation bar and camera-ready workflows.
- **Data Visualization**: View statistics about your dining habits.

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query, Wouter
- **Backend**: Node.js, Express, TypeScript
- **Database**: Drizzle ORM (currently configured with in-memory storage, adaptable for PostgreSQL)
- **AI**: OpenAI API

## Prerequisites

- Node.js (v20 or later recommended)
- OpenAI API Key (for receipt parsing features)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd rest-express
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Variables

Create a `.env` file in the root directory (or set these in your environment):

```env
# Required for AI features
AI_INTEGRATIONS_OPENAI_API_KEY=your_openai_api_key

# Optional (if you want to use PostgreSQL)
# DATABASE_URL=postgresql://user:password@host:port/dbname
```

## Running the Application

### Development

To run the application in development mode with hot reloading:

```bash
npm run dev
```

The server will start on port 5000 (default).

### Production

To build and start the application for production:

```bash
npm run build
npm start
```

## Project Structure

- `client/`: Frontend React application
- `server/`: Backend Express server
- `shared/`: Shared TypeScript schemas and types (Drizzle/Zod)
- `script/`: Build scripts

## Scripts

- `npm run dev`: Start the development server
- `npm run build`: Build the client and server
- `npm start`: Start the production server
- `npm run check`: Run TypeScript type checking
- `npm run db:push`: Push database schema changes (if using a real DB)

## License

MIT
