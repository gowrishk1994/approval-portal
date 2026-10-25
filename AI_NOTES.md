# AI usage notes

## Tools used

- **Github copilot:** used as a coding assistant React/TypeScript and Express code, refactor persistence to Sequelize, and propose workflow tests.
- **Chat GPT/Codex:** For UI/UX design suggestions for login and display screen.

## Example prompts used

I have used the AI tool in many cases like creating skeleton, creating cmponents, creating the test cases, then fixing some SMTP errors, SQL migration creation, documentation update etc, here are few example of propmts

1. “Create the initial project skeleton with a React frontend, a Node.js backend, and an appropriate folder structure.

Structure the backend as routes, controllers, services, models, helpers, and middleware.”

2. “Refactor persistence to Sequelize ORM with model associations and transactions. Use SQLite locally and support PostgreSQL via environment configuration.”

3. “Create meaningful integration tests for a successful approval-to-signature path, missing-document validation, unauthorized access, notification failure, and idempotent seed data.”

4. "Create the UI component for the given screenshot and integrate with these apis and api details are given below"

4. “Fix the email generation issue by passing the error (smtp not found...)”

## Example of an AI mistake and how it was addressed

- One of the first mistake was when i asked to create the skeleton, it has just created the everything in a single file for the backend apis without proper folder structure then i have explicitly asked to create the structure by mentioning all the folder required.

- Another instance of problem seen is when i asked to create the tests cases without details it has created many unnecessary test cases, so to address that i have mentioned the use case of the test cases. 

- Another iteration included raw SQL models and a custom SQL migration runner. The requested ORM approach was adopted by replacing application-level SQL persistence with Sequelize model operations, defining associations, and creating missing tables from models with `sequelize.sync()`. Initial data is seeded idempotently, and tests verify rows are not duplicated or overwritten. The code should still be run through the full build and test suite in the target environment rather than assumed correct because it was generated.

## Limits and responsible use

- AI-assisted code may contain dependency, security and edge-case errors. Review the implementation and run all tests before submission.

