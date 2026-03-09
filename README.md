This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

## Multi-Platform Hourly Crawl

This project now supports hourly crawls for:

- YouTube (US / JP / GB / HK)
- Weibo
- Zhihu
- Douyin
- Toutiao
- Bilibili
- XiaoHongShu
- Baidu Hot
- Baidu Tieba Hot

### Environment variables

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `YOUTUBE_API_KEY` (required for YouTube source)
- `WEIBO_COOKIE` (required for Weibo source)
- `XHS_HEADERS_JSON` (optional JSON string to override XiaoHongShu headers)

### Commands

```bash
pnpm hot:init-schema
pnpm crawl:hourly
pnpm crawl:hourly -- --dry-run
```

### New APIs

- `GET /api/hot/latest?limit=10`
- `GET /api/hot/{platform}/{board}?hour=2026-03-09 10:00:00`
- `GET /api/hot/{platform}/{board}?from=2026-03-09&to=2026-03-10`

### GitHub Scheduled Job

Hourly crawl is configured in:

- `.github/workflows/hot-crawl-hourly.yml`

Schedule:

- Every hour at minute `05` (UTC), which is `:05` in Beijing time as well.

Required GitHub repository secrets:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `YOUTUBE_API_KEY`
- `WEIBO_COOKIE`
- `XHS_HEADERS_JSON` (optional)

You can also trigger it manually from GitHub Actions with `workflow_dispatch`.
