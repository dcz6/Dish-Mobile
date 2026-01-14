# DishTracker - Food & Receipt Tracking App

## Overview

DishTracker is a mobile-first web application for tracking restaurant dishes and receipts. Users can capture photos of dishes and receipts, use AI-powered receipt parsing to extract itemized data, link dish photos to specific receipt line items, and rate dishes. The app provides a personal food journal experience with light data visualization.

This is a single-user MVP focused on utility and speed - optimized for "open → camera immediately" workflows with no authentication or social features.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for colors, typography, and spacing
- **Design Approach**: Mobile-first with Material Design principles for utility and Instagram-inspired photo grid aesthetics

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON API endpoints under `/api/`
- **Build Process**: Custom esbuild script bundles server code, Vite builds client

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Validation**: Zod schemas generated from Drizzle schemas using drizzle-zod
- **Current Storage**: In-memory storage implementation (`MemStorage` class) - database can be provisioned later

### Data Model
The application tracks:
- **Restaurants**: Name and optional address
- **Receipts**: Linked to restaurants, includes datetime, total amount, and raw LLM output for debugging
- **Dishes**: Unique dish names per restaurant
- **Dish Instances**: A specific order of a dish on a receipt, with price and rating
- **Dish Photos**: Images that can be linked to dish instances

### AI Integration
- **Receipt Parsing**: OpenAI GPT-4o-mini via the OpenAI SDK
- **Endpoint**: `POST /api/parse-receipt` accepts base64 image, returns structured JSON
- **Output**: Restaurant name, address, datetime, total, and line items with dish names and prices
- **Manual Correction**: UI allows users to fix parsing errors before saving

### Key Design Decisions
1. **Single-user focus**: No authentication system, simplifies architecture for MVP
2. **Shared schema**: Database types shared between client and server via `@shared/` path alias
3. **Mobile-first UI**: Bottom navigation bar, thumb-zone optimized layouts, camera-ready workflows
4. **Flexible photo linking**: Photos can be captured before or after receipts, then linked together

## External Dependencies

### AI Services
- **OpenAI API**: Used for receipt image parsing via GPT-4o-mini
  - Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`

### Database
- **PostgreSQL**: Configured in Drizzle but can be provisioned later
  - Environment variable: `DATABASE_URL`
  - Currently using in-memory storage as fallback

### Frontend Libraries
- **Radix UI**: Headless UI primitives for accessible components
- **TanStack Query**: Data fetching and caching
- **Embla Carousel**: Image carousel functionality
- **date-fns**: Date formatting utilities
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend dev server and bundler
- **esbuild**: Server bundling for production
- **Drizzle Kit**: Database migrations and schema push