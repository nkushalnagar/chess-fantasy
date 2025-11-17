import { scrapeAllNews } from './rss-scraper.js';
import { upsertNewsPost, postExists } from './supabase-client.js';
import { config } from './config.js';

/**
 * Main scraping function
 */
async function scrapeAndUpload() {
  console.log('═══════════════════════════════════════');
  console.log('♟️  Chess News Scraper');
  console.log('═══════════════════════════════════════');
  console.log(`⏰ ${new Date().toLocaleString()}\n`);

  try {
    // Scrape all news sources
    const posts = await scrapeAllNews();

    if (posts.length === 0) {
      console.log('⚠️  No posts found to upload');
      return;
    }

    // Upload to Supabase
    console.log('\n📤 Uploading to Supabase...');
    let newPosts = 0;
    let skippedPosts = 0;

    for (const post of posts) {
      try {
        // Check if post already exists
        const exists = await postExists(post.link);
        
        if (exists) {
          skippedPosts++;
          console.log(`⏭️  Skipped (duplicate): ${post.title}`);
          continue;
        }

        // Insert new post
        await upsertNewsPost(post);
        newPosts++;
        console.log(`✅ Added: ${post.title}`);
      } catch (error) {
        console.error(`❌ Error uploading post: ${error.message}`);
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`📊 Summary:`);
    console.log(`   • New posts: ${newPosts}`);
    console.log(`   • Skipped (duplicates): ${skippedPosts}`);
    console.log(`   • Total scraped: ${posts.length}`);
    console.log('═══════════════════════════════════════\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

/**
 * Run scraper on interval
 */
async function runScheduled() {
  // Run immediately
  await scrapeAndUpload();

  // If interval is 0, run once and exit (for GitHub Actions)
  if (config.scraping.intervalMinutes === 0) {
    console.log('✅ Single run completed. Exiting...\n');
    process.exit(0);
  }

  // Then run on interval
  const intervalMs = config.scraping.intervalMinutes * 60 * 1000;
  console.log(`⏱️  Scheduled to run every ${config.scraping.intervalMinutes} minutes\n`);

  setInterval(async () => {
    await scrapeAndUpload();
  }, intervalMs);
}

// Check if running as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check for required environment variables
  if (!config.supabase.url || !config.supabase.serviceKey) {
    console.error('❌ Missing required environment variables!');
    console.error('   Please copy .env.example to .env and fill in your credentials.');
    process.exit(1);
  }

  // Run the scraper
  runScheduled().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { scrapeAndUpload };
