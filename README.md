# Varianta — E-commerce REST API

**A production-deployed e-commerce backend built with Node.js, Express.js, PostgreSQL, and Prisma.**

Varianta is a generic e-commerce REST API designed to support product catalogs, configurable product variants, authentication, role-based authorization, and order management. It provides a structured backend foundation that independent frontend applications can integrate with through a documented REST API.

**Live API Documentation:** [Swagger UI](https://varianta.5goosh.ir/api-docs)

**Repository:** [github.com/dev9fe8891/varianta](https://github.com/dev9fe8891/varianta)

The API is deployed on a VPS, and its interactive Swagger documentation is available online for exploring endpoints, reviewing request and response schemas, and testing supported operations.

## Highlights

- **Production deployment:** Deployed to a VPS with a Docker-based deployment workflow.
- **RESTful API design:** Resource-oriented endpoints with structured request validation and consistent error handling.
- **Configurable product catalog:** Products, categories, options, option values, variants, and variant-option associations.
- **Authentication and authorization:** JWT-based authentication using HTTP-only cookies and role-based access control.
- **Order management:** Authenticated order creation, order retrieval, and administrative status management.
- **Database integrity:** PostgreSQL relational modeling, foreign-key constraints, unique constraints, indexes, and Prisma migrations.
- **API documentation:** OpenAPI 3.0.3 specification and interactive Swagger UI.
- **Automated testing:** Vitest and Supertest, with PostgreSQL-backed testing in CI.
- **CI/CD pipeline:** GitHub Actions automates testing, Docker image publishing, and VPS deployment.

## Technology Stack

| Area                    | Technologies                                         |
| ----------------------- | ---------------------------------------------------- |
| Runtime                 | Node.js 22                                           |
| Backend                 | Express.js 5, JavaScript, ES Modules                 |
| Database                | PostgreSQL                                           |
| ORM                     | Prisma 7                                             |
| PostgreSQL connectivity | `pg`, `@prisma/adapter-pg`                           |
| Validation              | Zod                                                  |
| Password security       | Argon2                                               |
| Authentication          | JWT, HTTP-only cookies                               |
| API specification       | OpenAPI 3.0.3                                        |
| Documentation UI        | Swagger UI                                           |
| Testing                 | Vitest, Supertest                                    |
| Security                | CORS configuration, origin validation, rate limiting |
| Deployment              | Docker, VPS                                          |
| CI/CD                   | GitHub Actions, GitHub Container Registry            |

## Architecture and Design

Varianta separates HTTP application setup, routing, middleware, configuration, and database access to keep responsibilities clear and the codebase maintainable.

The application uses an Express.js API layer, Zod-based request validation, centralized error handling, and Prisma for relational database operations. PostgreSQL enforces data integrity through relational constraints and indexes.

The API is designed to support an independently developed frontend without coupling backend business resources to a particular frontend framework.

### Core Domain Model

The database models the main e-commerce resources and their relationships.

| Entity               | Responsibility                                                 |
| -------------------- | -------------------------------------------------------------- |
| `User`               | User identity, password hash, and authorization role           |
| `Category`           | Product categorization                                         |
| `Product`            | Product details, description, image, and base price            |
| `ProductOption`      | Configurable properties of a product, such as size or color    |
| `OptionValue`        | Available values for each product option                       |
| `Variant`            | A purchasable configuration with its own SKU, price, and stock |
| `VariantOptionValue` | Associates a variant with its selected option values           |
| `Order`              | Customer order and lifecycle status                            |
| `OrderItem`          | Order-line quantity, price, SKU, and product-title snapshots   |

The model supports both simple products and products with multiple configurable variants.

Order items preserve important purchase-time information, including the product title, SKU, unit price, and line total. This helps retain an order's historical details when catalog information changes later.

## API Capabilities

The API exposes its resource contract through the live Swagger documentation.

### Product Catalog

- List products with pagination.
- Search products by supported text fields.
- Filter products by category and price range.
- Sort products using supported fields and sort directions.
- Retrieve individual products.
- Create, update, and delete products through authorized administrative operations.

### Categories

- List categories and retrieve individual categories.
- Create, update, and delete categories with administrative authorization.

### Configurable Products

- Manage product options and their positions.
- Manage option values and their positions.
- Manage variants with individual SKUs, prices, and stock quantities.
- Associate variants with their selected option values.

### Authentication

- Register a user.
- Log in and establish an authentication cookie.
- Log out and clear the authentication cookie.
- Retrieve the currently authenticated user's information.

### Orders

- Create orders for authenticated users.
- Retrieve order information subject to authorization rules.
- Manage order status through authorized administrative operations.
- Preserve purchase-time details in order items.

For exact endpoint paths, supported HTTP methods, request bodies, response schemas, status codes, and authentication requirements, see the [live Swagger UI](https://varianta.5goosh.ir/api-docs).

## Security

Security is implemented at multiple layers of the application.

- **Password hashing:** Argon2 is used to hash passwords rather than storing plaintext passwords.
- **Cookie-based authentication:** JWTs are stored in an HTTP-only `access_token` cookie.
- **Role-based authorization:** Administrative operations require the appropriate role.
- **Request validation:** Zod validates incoming request data before it reaches application logic.
- **CORS configuration:** Allowed browser origins are controlled through environment configuration.
- **Origin validation:** State-changing requests are checked against configured trusted origins.
- **Rate limiting:** Rate-limiting middleware is included to help mitigate excessive requests.
- **Database constraints:** Unique constraints, foreign keys, and indexes support data integrity.
- **Secret management:** Environment variables provide application secrets and database credentials outside the source code.

Production configuration must use appropriate secrets, HTTPS, and origin allowlists. Cookie settings and cross-origin behavior must match the actual deployment and its intended clients.

## API Documentation

**Explore the deployed API:** [https://varianta.5goosh.ir/api-docs](https://varianta.5goosh.ir/api-docs)

The OpenAPI specification is also served by the application:

- Local Swagger UI: `http://localhost:3000/api-docs`
- Local OpenAPI specification: `http://localhost:3000/api-docs/openapi.yaml`
- Deployed Swagger UI: `https://varianta.5goosh.ir/api-docs`

The specification documents the API contract, including resource schemas, parameters, responses, error cases, and cookie-based authentication.

For endpoints that require authentication or an administrative role, use the appropriate credentials and authorization context when testing requests in Swagger UI.

## Testing

The project uses Vitest and Supertest for automated testing.

Run the full test suite:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

The CI workflow provisions a PostgreSQL service, generates the Prisma Client, applies database migrations, and executes the test suite before proceeding to the deployment job.

Tests should use a dedicated test database. Avoid running destructive test or reset operations against a database containing data that must be preserved.

## Local Development

### Prerequisites

- Node.js 22 and npm
- PostgreSQL 14 or a compatible version
- Git

### 1. Clone the repository

```bash
git clone https://github.com/dev9fe8891/varianta.git
cd varianta
```

### 2. Install dependencies

```bash
npm ci
```

### 3. Configure environment variables

Create a local environment file:

```bash
cp .env.example .env
```

Configure the values for your local PostgreSQL database and development environment.

| Variable       | Description                                 |
| -------------- | ------------------------------------------- |
| `PORT`         | HTTP server port; defaults to `3000`        |
| `NODE_ENV`     | Application environment                     |
| `DATABASE_URL` | PostgreSQL connection string                |
| `JWT_SECRET`   | Secret used to sign JWTs                    |
| `CORS_ORIGINS` | Allowed browser origins                     |
| `CSRF_ORIGINS` | Trusted origins for state-changing requests |

Example local configuration:

```dotenv
PORT=3000
NODE_ENV=development

CORS_ORIGINS=http://localhost:5173
CSRF_ORIGINS=http://localhost:5173,http://localhost:3000

DATABASE_URL="postgresql://varianta_user:YOUR_LOCAL_PASSWORD@localhost:5432/varianta_db?schema=public"

JWT_SECRET=replace-with-a-long-random-secret
```

Replace the example credentials and secret with appropriate local values. Never commit real credentials or production secrets.

### 4. Generate Prisma Client

```bash
npx prisma generate --config prisma7.config.ts
```

### 5. Apply database migrations

```bash
npx prisma migrate deploy --config prisma7.config.ts
```

This applies existing migrations. It does not generate new migrations from changes to the Prisma schema.

### 6. Start the server

Development mode:

```bash
npm run dev
```

Standard startup:

```bash
npm start
```

The application listens on the configured port, defaulting to `3000`.

### 7. Verify the API

Send a request to the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{
  "status": "ok"
}
```

The health endpoint confirms that the HTTP application is responding. It should not be interpreted as a database readiness check.

## Database and Demo Data

The project includes scripts for populating the database with demo data and resetting it to a clean demo state.

**Seed demo data:**

```bash
RUN_DEMO_SEED=YES npm run db:seed:demo
```

**Reset and reseed demo data:**

```bash
RUN_DEMO_SEED=YES RUN_DEMO_RESET=YES npm run db:reset:demo
```

### Safety Requirements

- `RUN_DEMO_SEED=YES` explicitly confirms that demo data may be written to the database.
- `RUN_DEMO_RESET=YES` provides an additional confirmation required for the reset operation.
- The reset script only allows a database named `varianta_db`.
- Resetting deletes existing orders, regular user accounts, products, and categories before recreating the demo data. **Admin accounts are preserved.**
- A normal seed uses upserts to avoid duplicating existing demo records. It does not perform the reset operation, and existing variant stock is preserved.

Review `prisma/seed.js` before running these commands. Use only an appropriate development or disposable database, and never run them against a production database containing data you need to preserve.

## Docker

The repository includes a multi-stage Dockerfile for building a production-oriented application image.

Build the image:

```bash
docker build -t varianta:local .
```

Run the container:

```bash
docker run --rm \
  -p 3000:3000 \
  --env-file .env \
  varianta:local
```

The database must be reachable from the container through `DATABASE_URL`. When PostgreSQL runs outside the container, remember that `localhost` inside the container refers to the container itself.

For production deployments, provide environment variables securely and configure the database connection through the deployment's network and runtime settings.

## Continuous Integration and Deployment

The GitHub Actions workflow in `.github/workflows/deploy.yml` runs on pushes to the `main` branch.

The workflow performs the following operations:

1. Starts a PostgreSQL service for automated testing.
2. Installs dependencies with `npm ci`.
3. Generates the Prisma Client.
4. Applies existing database migrations.
5. Runs the automated test suite.
6. Builds and publishes a Docker image to GitHub Container Registry.
7. Connects to the VPS over SSH and updates the running Docker Compose application.

The deployment workflow uses GitHub Actions secrets for VPS connection details, including the host, SSH user, and SSH private key.

The VPS is expected to contain the deployment configuration at `/opt/apps/varianta`, including the Docker Compose configuration used by the workflow.

Production secrets and application environment variables must be configured in the deployment environment rather than committed to the repository.

## Project Structure

```text
varianta/
├── .github/
│   └── workflows/
├── prisma/
│   └── migrations/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── data/
│   ├── lib/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   └── validation/
├── tests/
├── .env.example
├── Dockerfile
├── openapi.yaml
├── package.json
├── package-lock.json
└── prisma7.config.ts
```

## Future Improvements

Potential areas for further development include:

- Integration with a frontend application.
- Payment-provider integration and payment lifecycle handling.
- Expanded observability, structured logging, and operational monitoring.
- Additional integration and edge-case tests.
- Production backup, recovery, and deployment rollback procedures.

These are possible future enhancements, not claims about existing functionality.

---

**Varianta demonstrates practical backend engineering across API design, relational data modeling, authentication, authorization, automated testing, containerization, and deployment.**
