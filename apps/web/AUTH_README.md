# Authentication Setup

This application uses [Better-auth](https://www.better-auth.com/) for flexible, secure authentication.

## Features

- ✅ Email/Password authentication
- ✅ Session management
- ✅ Protected routes
- ✅ PostgreSQL database with Prisma ORM
- ✅ OAuth providers support (Google, GitHub - configurable)
- ✅ TypeScript support
- ✅ Next.js 16 App Router compatible

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed via `pnpm install`.

### 2. Configure Environment Variables

Copy the `.env.example` file to `.env`:

```bash
cp .env.example .env
```

Update the following environment variables in `.env`:

- **DATABASE_URL**: Your PostgreSQL connection string
- **BETTER_AUTH_SECRET**: Generate a secure secret key (run `openssl rand -base64 32`)
- **BETTER_AUTH_URL**: Your application URL (default: `http://localhost:3000`)

### 3. Set Up Database

Run Prisma migrations to create the necessary tables:

```bash
pnpm dlx prisma migrate dev --name init
```

This will create the following tables:
- `users`
- `accounts`
- `sessions`
- `verification_tokens`

### 4. Generate Prisma Client

```bash
pnpm dlx prisma generate
```

### 5. Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Authentication Flow

### Sign Up
1. Navigate to `/auth/signup`
2. Enter name, email, and password
3. Submit the form
4. Redirected to dashboard upon success

### Sign In
1. Navigate to `/auth/signin`
2. Enter email and password
3. Submit the form
4. Redirected to dashboard upon success

### Protected Routes
The `/dashboard` route is protected and requires authentication. Unauthenticated users will be redirected to `/auth/signin`.

## Adding OAuth Providers

To add OAuth providers like Google or GitHub:

1. Obtain OAuth credentials from the provider
2. Add credentials to `.env`:
   ```
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   ```
3. Uncomment and configure the provider in `lib/auth.ts`:
   ```typescript
   socialProviders: {
     google: {
       clientId: process.env.GOOGLE_CLIENT_ID as string,
       clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
     },
   },
   ```

## Security Best Practices

1. **Use strong secrets**: Always generate a strong random secret for `BETTER_AUTH_SECRET`
2. **HTTPS in production**: Ensure `BETTER_AUTH_URL` uses HTTPS in production
3. **Environment variables**: Never commit `.env` file to version control
4. **Email verification**: Enable `requireEmailVerification: true` in production
5. **CSRF protection**: Better-auth includes CSRF protection by default
6. **Trusted origins**: Configure `trustedOrigins` in `lib/auth.ts` for production

## File Structure

```
apps/web/
├── app/
│   ├── api/auth/[...all]/route.ts   # Auth API routes
│   ├── auth/
│   │   ├── signin/page.tsx          # Sign-in page
│   │   └── signup/page.tsx          # Sign-up page
│   └── dashboard/page.tsx           # Protected dashboard
├── lib/
│   ├── auth.ts                      # Better-auth server config
│   ├── auth-client.ts               # Better-auth client hooks
│   └── prisma.ts                    # Prisma client instance
├── prisma/
│   └── schema.prisma                # Database schema
├── .env                             # Environment variables (not committed)
└── .env.example                     # Example environment variables
```

## API Endpoints

Better-auth automatically creates the following API endpoints at `/api/auth/*`:

- `/api/auth/sign-up` - User registration
- `/api/auth/sign-in` - User login
- `/api/auth/sign-out` - User logout
- `/api/auth/session` - Get current session
- And more...

## Resources

- [Better-auth Documentation](https://www.better-auth.com/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)
