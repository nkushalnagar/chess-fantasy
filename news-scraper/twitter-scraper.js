import puppeteer from 'puppeteer';
import { config } from './config.js';

/**
 * Scrape tweets from a Twitter account
 * @param {Object} account - Account configuration
 * @returns {Promise<Array>} Array of scraped tweets
 */
export async function scrapeTweets(account) {
  console.log(`\n🔍 Scraping ${account.source}...`);
  
  const browser = await puppeteer.launch({
    headless: config.scraping.headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    console.log(`📱 Navigating to ${account.url}...`);
    await page.goto(account.url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for tweets to load
    await page.waitForTimeout(3000);

    // Scroll to load more tweets
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1000);
    }

    // Extract tweet data
    const tweets = await page.evaluate((maxTweets) => {
      const articles = document.querySelectorAll('article[data-testid="tweet"]');
      const results = [];

      for (let i = 0; i < Math.min(articles.length, maxTweets); i++) {
        const article = articles[i];

        try {
          // Get tweet text
          const textElement = article.querySelector('[data-testid="tweetText"]');
          const text = textElement ? textElement.innerText : '';

          // Get tweet link
          const timeElement = article.querySelector('time');
          const linkElement = timeElement?.parentElement;
          const href = linkElement?.getAttribute('href');
          const link = href ? `https://x.com${href}` : '';

          // Get timestamp
          const datetime = timeElement?.getAttribute('datetime');

          // Get images
          const images = Array.from(
            article.querySelectorAll('img[src*="pbs.twimg.com/media"]')
          ).map((img) => img.src);

          // Only include tweets with content
          if (text && link) {
            results.push({
              text,
              link,
              published_at: datetime || new Date().toISOString(),
              image_url: images[0] || null,
            });
          }
        } catch (error) {
          console.error('Error parsing tweet:', error);
        }
      }

      return results;
    }, config.scraping.maxTweetsPerAccount);

    console.log(`✅ Found ${tweets.length} tweets from ${account.source}`);

    // Transform tweets to news post format
    return tweets.map((tweet) => ({
      title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
      content: tweet.text,
      source: account.source,
      link: tweet.link,
      image_url: tweet.image_url,
      published_at: tweet.published_at,
    }));
  } catch (error) {
    console.error(`❌ Error scraping ${account.source}:`, error.message);
    return [];
  } finally {
    await browser.close();
  }
}

/**
 * Scrape all configured Twitter accounts
 * @returns {Promise<Array>} Array of all scraped posts
 */
export async function scrapeAllAccounts() {
  console.log('🚀 Starting Twitter scrape...');
  const allPosts = [];

  for (const account of config.twitter.accounts) {
    const posts = await scrapeTweets(account);
    allPosts.push(...posts);
  }

  console.log(`\n📊 Total posts scraped: ${allPosts.length}`);
  return allPosts;
}
