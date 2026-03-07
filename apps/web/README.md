This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Contacts API (v1)

This project includes a robust Contacts CRUD API built for multi-tenant (workspace) environments.

### Base Path

All API endpoints are prefixed with `/api/v1/`.
The API strictly scopes all requests to the authenticated user's active organization (`activeOrganizationId`).

### Endpoints

#### Custom Fields API (`/contact-fields`)

Organizations can define up to 5 custom fields per workspace.

- `GET /v1/contact-fields`: Lists all field definitions.
- `POST /v1/contact-fields`: Creates a new field definition.
  - Body: `{ key: string, label: string, type: "TEXT"|"NUMBER"|"BOOLEAN"|"DATE"|"URL"|"SELECT", options?: string[] }`
- `PATCH /v1/contact-fields/[id]`: Updates a field definition.
- `DELETE /v1/contact-fields/[id]`: Deletes a field definition.

#### Contacts API (`/contacts`)

- `GET /v1/contacts`: Lists contacts (supports soft deletes, pagination via `page`/`limit`, and searching via `q`).
- `POST /v1/contacts`: Creates a new contact.
  - **Rules**: Must provide `name`. Must provide either `phoneE164` OR `email`.
  - Custom fields are strictly validated against their database definition types.
- `GET /v1/contacts/[id]`: Fetches a single contact.
- `PATCH /v1/contacts/[id]`: Updates a contact. Enforces the rule that a contact cannot have both phone and email removed entirely.
- `DELETE /v1/contacts/[id]`: Soft-deletes a contact.
