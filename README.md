This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Shadertoy Archive Script

This repo now includes a CLI archiver at `scripts/save-shadertoy-shaders.mjs` for downloading Shadertoy shaders and saving them into a structured local archive with normalized metadata plus the raw API payload.

It is designed to archive every shader that your Shadertoy API key can access through the official API, which is the safest bulk-download path Shadertoy exposes.

Example usage:

```bash
cd /Users/vysak/Explorations/Utopia
export SHADERTOY_API_KEY=your_app_key

# archive every shader your key can access
npm run shadertoy:archive -- --all --resume

# archive a query subset
npm run shadertoy:archive -- --query ocean --limit 25
```

Output is written to `data/shadertoy/` by default in this structure:

```text
data/shadertoy/<author>/<yyyy-mm-dd>_<title>_<id>/
  metadata.json
  raw.json
  passes/
```

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
