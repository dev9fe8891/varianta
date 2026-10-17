# Varianta

Varianta is a generic e-commerce REST API designed to support simple and configurable products. It provides a backend foundation for e-commerce applications and can be consumed by independent frontend clients.

## Features

- RESTful API architecture
- Support for simple and configurable products
- Product options, option values, and variants
- User authentication using JWT and HTTP-only cookies
- Request validation using Zod
- PostgreSQL database with Prisma ORM
- API documentation using OpenAPI and Swagger UI
- Automated tests using Vitest

## Tech Stack

- **Runtime:** Node.js
- **Backend:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Authentication:** JWT and HTTP-only cookies
- **API Documentation:** OpenAPI and Swagger UI
- **Testing:** Vitest

## Requirements

Before running the project, make sure you have installed:

- Node.js and npm
- PostgreSQL
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/dev9fe8891/varianta.git
cd varianta
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file using `.env.example` as a reference.

Configure the following variables:

| Variable       | Description                                                    |
| -------------- | -------------------------------------------------------------- |
| `PORT`         | Port used by the application                                   |
| `NODE_ENV`     | Application environment, such as `development` or `production` |
| `DATABASE_URL` | PostgreSQL connection string                                   |
| `JWT_SECRET`   | Secret used to sign JWTs                                       |

Use a strong, randomly generated JWT secret. Never commit `.env` files or production credentials to the repository.

### 4. Configure PostgreSQL

Create a PostgreSQL database and database user matching your local configuration.

Update `DATABASE_URL` in `.env` with the correct connection details.

Apply the existing Prisma migrations:

```bash
npx prisma migrate deploy
```

This command applies pending migrations. It does not create new migrations from schema changes.

### 5. Run the application

Start the development server:

```bash
npm run dev
```

Alternatively, start the application without the development watch mode:

```bash
npm start
```

The application listens on the port configured by `PORT`, which defaults to `3000`.

## API Documentation

When the application is running, the API documentation is available at:

- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI specification: `http://localhost:3000/api-docs/openapi.yaml`

The documentation describes the API endpoints, request schemas, response formats, and authentication requirements.

## API Endpoints

The API is organized under the `/api` prefix.

The available endpoint groups include:

- Health check
- Authentication
- Products
- Categories
- Product options and option values
- Product variants
- Orders

Consult Swagger UI or the OpenAPI specification for the exact paths, supported HTTP methods, request formats, and authorization requirements.

### Health Check

```http
GET /api/health
```

The endpoint reports the application's current status. It should not be interpreted as a database readiness check unless database connectivity is explicitly included in its implementation.

## Testing

The project uses Vitest for automated tests.

Run the test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Tests use the `.env.test` configuration and a separate test database. Ensure that the test database exists and is configured correctly before running the suite.

**Warning:** Test setup and test data management should be reviewed before running tests against any database containing data you need to preserve.

## Environment Configuration

The project uses separate environment configurations for different purposes:

- `.env`: local development settings
- `.env.test`: automated test settings
- `.env.example`: documented template for required environment variables

Production configuration should be supplied through the deployment environment rather than by committing production secrets to the repository.

## Deployment

The intended production API endpoint is:

`https://varianta.5goosh.ir`

The API is intended to be consumed by independent frontend applications. The backend and its clients may run on separate origins, so production deployment must account for CORS, cookie security, authentication, and HTTPS.

PostgreSQL is intended to run on the same VPS as the API, with database access restricted to the appropriate server-side network and credentials.

Before production deployment, verify the following:

- Production environment variables and database credentials
- HTTPS termination and reverse-proxy configuration
- CORS allowlist for the intended frontend origins
- Cookie settings and cross-origin authentication behavior
- Database migrations and backup/recovery procedures
- Health and readiness checks
- Logging, error handling, and operational monitoring
- API documentation access policy
- Production startup and restart behavior

Docker configuration, automated deployment, and production operational procedures should be documented once they have been implemented and verified. This README does not claim that these deployment components are already configured.

## License

Refer to the license declared in `package.json` and verify that it matches the license file and distribution terms intended for this project before publishing or redistributing the repository.
