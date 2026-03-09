import 'dotenv/config';
import { crawlAllSources } from '../src/lib/hot/sources';
import { parseToSnapshotHour, toSnapshotHour } from '../src/lib/hot/time';
import { CrawlResult } from '../src/lib/hot/types';

interface CliOptions {
  dryRun: boolean;
  noRetry: boolean;
  retryDelayMs: number;
  snapshotHour: string;
}

function parseCliArgs(): CliOptions {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const noRetry = args.includes('--no-retry');

  const retryDelayArg = args.find((arg) => arg.startsWith('--retry-delay-ms='));
  const retryDelayMs = retryDelayArg ? Number(retryDelayArg.split('=')[1]) : 2000;

  const hourArg = args.find((arg) => arg.startsWith('--hour='))?.split('=')[1];
  const snapshotHour = hourArg ? parseToSnapshotHour(hourArg) : toSnapshotHour();

  if (!snapshotHour) {
    throw new Error('Invalid --hour format. Example: --hour=2026-03-09 10:00:00');
  }

  return {
    dryRun,
    noRetry,
    retryDelayMs: Number.isFinite(retryDelayMs) && retryDelayMs >= 0 ? retryDelayMs : 2000,
    snapshotHour,
  };
}

function sourceKey(result: CrawlResult) {
  if (result.status === 'success') {
    return `${result.payload.platformKey}:${result.payload.boardKey}`;
  }
  return `${result.platformKey}:${result.boardKey}`;
}

function printSummary(title: string, results: CrawlResult[]) {
  const success = results.filter((item) => item.status === 'success');
  const failed = results.filter((item) => item.status === 'failed');
  console.log(`\n${title}`);
  console.log(`success=${success.length}, failed=${failed.length}`);

  for (const item of success) {
    console.log(
      `  [ok] ${item.payload.platformKey}/${item.payload.boardKey} items=${item.payload.items.length} top=${
        item.payload.items[0]?.title ?? 'N/A'
      }`,
    );
  }
  for (const item of failed) {
    console.log(`  [failed] ${item.platformKey}/${item.boardKey} ${item.error}`);
  }
}

async function retryFailedIfNeeded(results: CrawlResult[], options: CliOptions): Promise<CrawlResult[]> {
  if (options.noRetry) return results;
  const failedKeys = new Set(
    results
      .filter((item) => item.status === 'failed')
      .map((item) => `${item.platformKey}:${item.boardKey}`),
  );
  if (!failedKeys.size) return results;

  await new Promise((resolve) => setTimeout(resolve, options.retryDelayMs));
  const retryResults = await crawlAllSources();
  const retryMap = new Map(retryResults.map((item) => [sourceKey(item), item]));

  return results.map((item) => {
    const key = sourceKey(item);
    if (item.status === 'failed' && retryMap.has(key)) {
      return retryMap.get(key)!;
    }
    return item;
  });
}

async function main() {
  const options = parseCliArgs();
  console.log(`snapshotHour=${options.snapshotHour}, dryRun=${options.dryRun}, noRetry=${options.noRetry}`);

  const initialResults = await crawlAllSources();
  printSummary('initial crawl', initialResults);

  const finalResults = await retryFailedIfNeeded(initialResults, options);
  if (finalResults !== initialResults) {
    printSummary('after retry', finalResults);
  }

  if (options.dryRun) {
    console.log('\ndry-run complete, no database writes');
    return;
  }

  const { ensureHotSchema, saveCrawlResults } = await import('../src/lib/hot/db');
  await ensureHotSchema();
  const summary = await saveCrawlResults(options.snapshotHour, finalResults);
  console.log(`\nstored snapshot hour=${options.snapshotHour} success=${summary.success} failed=${summary.failed}`);
}

main().catch((error) => {
  console.error('crawl-hourly failed:', error);
  process.exit(1);
});
