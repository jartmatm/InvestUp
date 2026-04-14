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

## Android Studio with Capacitor

Use this flow when you want Android Studio to reflect your changes while you edit the app in VS Code.

```bash
npm run android:dev
```

This command:

- starts Next.js on `0.0.0.0:3000`
- syncs Capacitor Android with `http://10.0.2.2:3000`
- opens the Android project in Android Studio

Then run the app from Android Studio on an emulator. Keep the terminal open while you work and the app will refresh with your code changes.

If you only need to resync native Capacitor changes, run:

```bash
npm run android:sync
```

For a physical Android device, start the same command with your machine IP:

```powershell
$env:CAP_SERVER_URL="http://192.168.1.10:3000"
npm run android:dev
```

## Environment variables

Client-side (exposed in the bundle):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `NEXT_PUBLIC_PIMLICO_API_KEY` (or `NEXT_PUBLIC_PIMLICO_BUNDLER_URL`)

Server-side only (keep these secret):

- `SUPABASE_SERVICE_ROLE_KEY` (required for `/api/withdrawals`)
- `SUPABASE_URL` (optional, falls back to `NEXT_PUBLIC_SUPABASE_URL`)
- `PRIVY_APP_SECRET` (required for `/api/withdrawals`)
- `PRIVY_APP_ID` (optional, falls back to `NEXT_PUBLIC_PRIVY_APP_ID`)
- `MANUAL_WITHDRAWAL_WALLET` (optional, defaults to the operations wallet in code)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
