# CRUD Express TS

[![CI](https://github.com/Eric-Formiga/crud-express-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/Eric-Formiga/crud-express-ts/actions/workflows/ci.yml)

A REST API for managing users (CRUD), built with **Node.js, Express and TypeScript**, following good practices: layered architecture, input validation, password hashing, centralized error handling, and unit + end-to-end tests running in CI.

## Features

- Create, list, get, update and delete users
- Request validation with Zod (body and route params), including email normalization
- Passwords hashed with bcrypt and **never** returned by the API
- Unique email enforced both in the service and by a database constraint (safe under concurrent requests)
- Centralized error handling with consistent JSON error responses
- Environment variables validated on startup (fail fast)
- 63 automated tests (41 unit + 22 e2e) running on every pull request

## Tech stack

| Category     | Tools                                   |
| ------------ | --------------------------------------- |
| Runtime      | Node.js 22.9+, TypeScript (strict mode) |
| HTTP         | Express 5                               |
| Database     | PostgreSQL 17 (Docker), Prisma 7        |
| Validation   | Zod 4                                   |
| Security     | bcrypt                                  |
| Tests        | Vitest, Supertest                       |
| Code quality | ESLint, Prettier                        |
| CI           | GitHub Actions                          |

## Project structure

```
src/
├── app.ts                   # Express app (middlewares + routes), exported for tests
├── server.ts                # Starts the HTTP server
├── env.ts                   # Environment variables validation (Zod)
├── routes/                  # URL + HTTP method → controller
├── controllers/             # HTTP layer: validates input, sends responses
├── services/                # Business rules (unique email, password hashing, 404s)
├── schemas/                 # Zod schemas and inferred types
├── middlewares/             # Centralized error handling
├── utils/                   # AppError
├── database/                # Shared PrismaClient instance
└── tests/
    ├── unit/                # Isolated tests (no database)
    └── e2e/                 # HTTP tests against a real test database
prisma/
├── schema.prisma            # User model
└── migrations/              # Versioned database migrations
```

A request flows through the layers like this:

```
route → controller (validate) → service (business rules) → Prisma → PostgreSQL
                     ↓ any thrown error
              error-handling middleware → JSON error response
```

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 22.9 or newer
- [Docker](https://www.docker.com/)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/Eric-Formiga/crud-express-ts.git
cd crud-express-ts

# 2. Create the environment file
cp .env.example .env

# 3. Start PostgreSQL
docker compose up -d

# 4. Install dependencies (also generates the Prisma Client)
npm install

# 5. Apply the database migrations
npm run db:migrate

# 6. Start the API in development mode
npm run dev
```

The API will be available at `http://localhost:3333`.

### Environment variables

| Variable       | Description                           | Default       |
| -------------- | ------------------------------------- | ------------- |
| `NODE_ENV`     | `development`, `test` or `production` | `development` |
| `PORT`         | HTTP port                             | `3333`        |
| `DATABASE_URL` | PostgreSQL connection string          | — (required)  |

## API

### Endpoints

| Method   | Route        | Description               | Success |
| -------- | ------------ | ------------------------- | ------- |
| `GET`    | `/health`    | Health check              | `200`   |
| `POST`   | `/users`     | Create a user             | `201`   |
| `GET`    | `/users`     | List users (newest first) | `200`   |
| `GET`    | `/users/:id` | Get a user by id          | `200`   |
| `PATCH`  | `/users/:id` | Update one or more fields | `200`   |
| `DELETE` | `/users/:id` | Delete a user             | `204`   |

### Validation rules

| Field      | Rules                                    |
| ---------- | ---------------------------------------- |
| `name`     | Trimmed, at least 3 characters           |
| `email`    | Trimmed, lowercased, valid email, unique |
| `password` | 6 to 72 characters (bcrypt limit)        |
| `id`       | Valid UUID                               |

On `PATCH`, every field is optional, but at least one must be provided. Unknown fields are ignored.

### Examples

**Create a user**

```bash
curl -X POST http://localhost:3333/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@email.com", "password": "123456"}'
```

```json
{
  "id": "6f33cfca-cc3f-4747-8a67-f016a3b10d38",
  "name": "John Doe",
  "email": "john@email.com",
  "createdAt": "2026-10-18T22:44:27.086Z",
  "updatedAt": "2026-10-18T22:44:27.086Z"
}
```

**Update a user**

```bash
curl -X PATCH http://localhost:3333/users/6f33cfca-cc3f-4747-8a67-f016a3b10d38 \
  -H "Content-Type: application/json" \
  -d '{"name": "John Updated"}'
```

**Delete a user**

```bash
curl -X DELETE http://localhost:3333/users/6f33cfca-cc3f-4747-8a67-f016a3b10d38
```

### Errors

Every error returns JSON with a `message`. Validation errors also include `issues`, with the messages for each field.

```json
{
  "message": "Validation error",
  "issues": {
    "email": ["Invalid email"],
    "password": ["Password must have at least 6 characters"]
  }
}
```

| Status | When                                                 |
| ------ | ---------------------------------------------------- |
| `400`  | Invalid body or params, malformed JSON               |
| `404`  | User or route not found                              |
| `409`  | Email already in use                                 |
| `500`  | Unexpected error (details are logged, never exposed) |

## Tests

```bash
npm run test:unit   # 41 unit tests, no database needed
npm run test:e2e    # 22 e2e tests, requires Docker running
npm test            # all tests
```

- **Unit tests** cover the Zod schemas, the service business rules (with Prisma and bcrypt mocked) and every branch of the error-handling middleware.
- **E2E tests** send real HTTP requests with Supertest through every layer, down to a dedicated database (`crud_express_ts_test`, configured in `.env.test`). The database is migrated once before the run and cleaned before each test. A safety check aborts the run if `DATABASE_URL` does not point to a `_test` database.

## Scripts

| Script                 | Description                           |
| ---------------------- | ------------------------------------- |
| `npm run dev`          | Start in watch mode with `tsx`        |
| `npm run build`        | Compile TypeScript to `dist/`         |
| `npm start`            | Run the compiled build                |
| `npm run typecheck`    | Type-check without emitting files     |
| `npm run lint`         | Run ESLint                            |
| `npm run format`       | Format files with Prettier            |
| `npm run format:check` | Check formatting                      |
| `npm test`             | Run all tests                         |
| `npm run test:watch`   | Run tests in watch mode               |
| `npm run db:migrate`   | Create/apply migrations (development) |
| `npm run db:studio`    | Open Prisma Studio                    |

## Continuous integration

Every pull request and push to `main` runs the [CI workflow](.github/workflows/ci.yml): install → lint → format check → typecheck → build → unit tests → e2e tests (against a PostgreSQL service container).

## Development workflow

Each step of the project was developed in its own branch and merged through a pull request, using [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `test:`, `ci:`, `docs:`, `chore:`). See the [pull requests](https://github.com/Eric-Formiga/crud-express-ts/pulls?q=is%3Apr) for the step-by-step history.
