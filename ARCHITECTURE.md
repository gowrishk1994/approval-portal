# Approval Portal — Solution and Architecture

## Solution overview

The portal lets a requester select a project, start an approval workflow, upload supporting documents, and submit the request. The assigned approver reviews and approves it, receives an email with a signing link, then signs in and submits a typed-name signature to complete the workflow.

The React and TypeScript client provides the screens and sends requests to the Express API. The API authenticates users, enforces role and workflow rules, stores workflow data and audit events through Sequelize, keeps uploaded files on the server, and sends signature notifications through SMTP.

## Architecture diagram

```text
       Requester / Approver
                │
                ▼
       React + TypeScript UI
                │ REST API (JSON / file upload)
                ▼
       Express API
       ├── Authentication and session checks
       ├── Routes and request validation
       └── Workflow services
             ├── Role, ownership, and state checks
             ├── Sequelize ── SQLite (local)
             │               └ PostgreSQL (DATABASE_URL)
             ├── Local document storage
             └── SMTP email ── Approver signing link

       server/.env
       └── Account profiles, credentials, session,
           database, and SMTP configuration
```

## Main workflow

```text
Select project → Start workflow → Upload documents
       → Request approval → Approver approves
       → Email signing link → Approver signs → Completed
```

1. A requester signs in and selects a project from the catalog.
2. The API creates a draft workflow and assigns the configured approver.
3. The requester uploads documents. The API checks access and workflow state, saves the files, and records their metadata.
4. The requester submits the workflow. The API requires at least one document and moves the workflow to pending approval.
5. The assigned approver approves the request. The API saves the approval and audit event, then emails a link to the approver.
6. The approver opens the link, signs in, reviews the workflow, and submits a typed-name signature. The API records it and marks the workflow complete.

## Design rationale

- **The API enforces workflow rules.** Role, ownership, document, and state checks happen on the server so users cannot bypass them by changing the UI.
- **Workflow history stays consistent.** A workflow change and its audit event are saved in one database transaction. Email is sent after approval is saved, so an email problem does not undo the approval.
- **Configuration is separate from code.** Requester and approver profiles, credentials, database, and SMTP settings come from environment variables. Passwords are hashed before storage.
- **Local setup stays straightforward.** SQLite and server-disk uploads avoid requiring cloud services for development. PostgreSQL can be selected with `DATABASE_URL`.
- **One repository keeps this small app simple.** The client and API have separate folders and responsibilities but are maintained together. They could become separate services as the application grows; splitting them now would add deployment and operational work without a clear benefit.
- **The signature is intentionally simple.** A typed name demonstrates the approval flow; it is not a qualified electronic signature.

## Implementation plan

1. **Set up the app:** keep the React client and Express API in separate folders within one repository, with environment-specific configuration kept out of source code.
2. **Add accounts and project data:** seed the project catalog and configured requester/approver accounts.
3. **Implement secure access:** add login, signed HttpOnly session cookies, role checks, and workflow ownership checks.
4. **Build the workflow:** implement project selection, document upload, approval submission, approver decision, email link, and signature recording.
5. **Record changes and verify:** save workflow transitions and audit events transactionally; test the main journey and access/error cases.

