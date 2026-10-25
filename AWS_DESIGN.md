# AWS deployment design

This is a proposed deployment for the approval portal

## Architecture

```text
Requester / Approver
        │ HTTPS
        ▼
Route 53 + ACM ── CloudFront ── Private S3 bucket (React UI)
                         │ /api
                         ▼
                  Application Load Balancer
                         │
                         ▼
                  ECS Fargate
                  (Dockerized Express API)
                    │       │        │
                    │       │        └── Amazon SES (approval/signature email)
                    │       └─────────── Private S3 bucket (uploaded documents)
                    ▼
               Amazon RDS (PostgreSQL)

GitHub Actions (OIDC) ── test/build ── ECR + S3 ── deploy ECS + CloudFront
Secrets Manager ── database and email credentials
CloudWatch ── application logs, metrics, and alarms
```

## How the portal flow works

1. CloudFront serves the React UI. The user signs in and sees the project list.
2. The user selects a project and starts a workflow. The API checks the requester role and saves the workflow in PostgreSQL, assigning the configured approver.
3. The requester uploads documents. The API checks the workflow and file, then stores the document in a private S3 bucket and its metadata in PostgreSQL.
4. The requester requests approval. The API updates the workflow state; the approver sees it in their approval queue.
5. The approver approves. The API saves the approval and uses Amazon SES to email a link to the signature page.
6. The approver follows the link and signs in, reviews the workflow, and submits a typed-name signature. The API records the signature and audit event in PostgreSQL, then marks the workflow complete.

## Services and security

- **CloudFront, S3, Route 53, and ACM** serve the frontend over HTTPS. Keep the frontend and document buckets private; use CloudFront Origin Access Control for the UI bucket.
- **Docker, ECR, Application Load Balancer, and ECS Fargate** package and run the Express API as a container instead of deploying its source code directly. Run tasks in private subnets and allow only required traffic from the load balancer. The React frontend is built as static files and served from S3/CloudFront; it does not need to run in a container in this design.
- **RDS PostgreSQL** stores users, projects, workflow state, document metadata, signatures, and audit events. Enable encryption, backups, and Multi-AZ for production.
- **Private S3 document storage** replaces the prototype's local upload directory. Allow access only through the API's task role; authorize each download before returning a short-lived link or streaming the file.
- **Amazon SES** can replace the configured SMTP provider for signature emails. Keep email/database credentials in Secrets Manager, not in the source repository.
- Preserve the current role and workflow-state checks in the API. Use secure session cookies, least-privilege IAM roles, TLS, and CloudWatch logging/alarms. Do not log passwords, session tokens, or document contents.

## CI/CD

GitHub Actions runs the tests and builds the app when code changes. For a release, it builds the API Docker image, pushes it to ECR, deploys it to ECS, and publishes the frontend files to S3/CloudFront. AWS credentials are managed securely.

## Changes needed before deployment

The current app uses SQLite or a configured database URL, local disk for uploads, and SMTP for email. Deployment would require PostgreSQL on RDS, S3-backed document storage, and SES (or another production SMTP provider). Configure the account profiles, database, email, and session secrets through Secrets Manager or the deployment environment.
