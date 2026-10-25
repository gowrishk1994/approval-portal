# Approval Portal

A project approval portal for this workflow: select a project, start a workflow, upload documents, request approval, approve as the assigned approver, receive an email signing link, and complete the workflow with a typed-name signature.

## Technology stack

- **Frontend:** React, TypeScript, Vite, reusable typed components.
- **Backend:** Node.js (ES modules), Express, Zod validation, Multer upload handling, Helmet security headers.
- **ORM:** Sequelize v6. Application code uses Sequelize models, associations, and transactions rather than handwritten SQL queries.
- **Database:** SQLite locally by default; PostgreSQL can be selected with `DATABASE_URL`.
- **Schema creation:** Sequelize `sync()` creates missing tables from registered models at startup.
- **Seed data:** Projects are seeded idempotently; requester and approver profiles are synchronized from environment settings.
- **Notifications:** Nodemailer SMTP adapter; when SMTP is not configured, notification attempts are logged locally and the API reports delivery as unavailable.
- **Tests:** Node's built-in test runner and Supertest for API integration tests; Vitest and Testing Library for client component and functional tests.

## Requirements

- Node.js 20 or later
- npm

## Run locally

From the repository root, copy the sample server settings and install dependencies:

```
Copy server\.env.example server\.env
npm install
npm run install:all
```

Edit `server\.env` and set the requester and approver names, email addresses, usernames, and passwords. To send real signature emails, configure valid SMTP settings. Without SMTP configuration, notification attempts are logged locally and no email is sent.

Start the app:

```
npm run dev
```

The command sets up the database and starts the API and React development server. Open `http://localhost:5173`; the API listens at `http://localhost:4000`.


To manage the database explicitly:

```bash
npm run db:setup
```

This command is safe to rerun:

```bash
npm run db:seed
```

To run the backend integration tests, frontend component and functional tests, and build the frontend:

```bash
npm test
npm run build
```

## Database configuration

For PostgreSQL, configure the server environment (if not configured in env file then it will be run in local sqlLite):

```env
DATABASE_URL=postgres://username:password@localhost:5432/approval_portal
DATABASE_SSL=false
```

## Sequelize model synchronization and seed data

```text
server/
  seeders/
    20261024000100-seed-initial-users-and-projects.js
  src/
    config/database.js                 Sequelize sync and connection lifecycle
    config/seed.js                     Idempotent seed runner
    scripts/setup-database.js          Sync models and seed data
    models/
      index.js
```

## Design decisions and trade-offs

1. The server checks who can view, approve, or sign each workflow. This keeps important rules out of the browser.
2. Workflow updates and their history are saved together. Email is sent afterward, so an email problem does not undo an approval.
3. Account names, emails, and login details come from environment settings, so they can be changed without editing code.
4. SQLite and local file storage make the app easy to run on one computer. They are not suitable for sharing data and files across multiple production servers.
5. The app creates missing database tables automatically for local setup.
6. **Single-repository structure:** The client and API are kept in one repository because the application is currently small and has a single workflow. If it grows, its modules could be separated into independently deployable services. That would add operational complexity, so it isn't necessary yet.

## Improvements

- We details are hard coded in the code in UI and backend side those need to be taken from constants/env files.
- Need to handle the Auth in more precious way in API side.
- Handle the user creation and project creation instead of hard coding in migration.
- Reliable email delivery with retries and retry for document uploads.
- Integrate a qualified e-signature provider 
- More test cases with end to end test cases.
