import 'dotenv/config';
import { ensureHotSchema } from '../src/lib/hot/db';

async function main() {
  await ensureHotSchema();
  console.log('hot schema ready');
}

main().catch((error) => {
  console.error('failed to init hot schema:', error);
  process.exit(1);
});
