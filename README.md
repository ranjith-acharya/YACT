# Alakkal Community Portal

A production-grade community management system built with Laravel 11 and React 18.

## Tech Stack

**Backend:** Laravel 11, PHP 8.2+, MySQL 8+, Sanctum, Spatie Permission  
**Frontend:** React 18, Vite, Tailwind CSS v4, Framer Motion  

## Prerequisites

- PHP 8.2+
- Composer
- Node.js 20+
- MySQL 8+

## Setup

### 1. Backend

```bash
# Install dependencies (already done)
composer install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Generate app key
php artisan key:generate

# Create the database
mysql -u root -e "CREATE DATABASE IF NOT EXISTS alakkal_community;"

# Run migrations and seed
php artisan migrate --seed

# Start the server
php artisan serve
```

### 2. Frontend

```bash
cd frontend

# Install dependencies (already done)
npm install

# Start dev server
npm run dev
```

## Running the Application

Open **two terminals** and run each command in its own terminal:

**Terminal 1 -- Backend (Laravel API)**

```bash
php artisan serve
```

**Terminal 2 -- Frontend (React dev server)**

```bash
cd frontend
npm run dev
```

Once both are running:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000/api |

### Default Super Admin Login

- **Email:** superadmin@alakkal.com
- **Password:** password

## Role Hierarchy

| Role | Permissions |
|------|------------|
| Super Admin | Full access (only one allowed) |
| Admin | Manage users, members, events, roles |
| Manager | Manage members, events, approve requests |
| Sub-Manager | Submit member requests, view data |
| Member | View dashboard, members, events |

## Workflow

1. Sub-Manager submits a member request
2. Manager/Admin reviews and approves/rejects
3. On approval, a new Member record is created

## Key Features

- Role-based access control (RBAC)
- Soft delete strategy (no hard deletes)
- Dark mode with system preference detection
- Global command palette (Ctrl+K)
- Responsive design
- Skeleton loading states
- Toast notifications
- Framer Motion animations

## API Endpoints

| Method | Endpoint | Auth | Roles |
|--------|----------|------|-------|
| POST | /api/register | No | - |
| POST | /api/login | No | - |
| POST | /api/logout | Yes | Any |
| GET | /api/me | Yes | Any |
| GET | /api/dashboard | Yes | Any |
| GET | /api/search?q= | Yes | Any |
| GET | /api/members | Yes | Any |
| POST | /api/members | Yes | Manager+ |
| GET | /api/events | Yes | Any |
| POST | /api/events | Yes | Manager+ |
| GET | /api/member-requests | Yes | Sub-Manager+ |
| POST | /api/member-requests | Yes | Sub-Manager+ |
| GET | /api/users | Yes | Admin+ |
| GET | /api/roles | Yes | Any |
