This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Copy environment defaults and set a server-only API secret (required for `/api/**` POST routes):

```bash
cp .env.example .env.local
# Set CODIA_API_SECRET to a long random value (never NEXT_PUBLIC_*)
```

Then run the development server:

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

### API access guard

`POST /api/**` routes require either:

- `Authorization: Bearer <CODIA_API_SECRET>` (scripts / external callers), or
- a valid httpOnly session cookie minted by `POST /api/auth/session` after proving the same secret (browser unlock in Settings)

`GET /api/auth/session` only reports whether a valid session cookie already exists; it never issues cookies to anonymous callers.

Middleware and route handlers also enforce body-size limits (4 MiB default; 32 MiB for `/api/vision/**`) and a basic rate limit (60 req/min). Forwarding headers are trusted for rate-limit keys when `CODIA_TRUST_PROXY` is enabled or when running on Vercel. This is a shared-secret session gate — not full user/JWT auth.

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
