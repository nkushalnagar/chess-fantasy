import axios from 'axios';
import * as cheerio from 'cheerio';
import { config } from './config.js';

const RSS_FEEDS = [
  {
    url: 'https://www.chess.com/news',
    source: 'Chess.com',
    type: 'html', // Scrape HTML page
  },
  {
    url: 'https://en.chessbase.com',
    source: 'ChessBase',
    type: 'html',
  },
  {
    url: 'https://chess24.com/en/read/news',
    source: 'Chess24',
    type: 'html',
  },
];

/**
 * Scrape Chess.com news
 */
async function scrapeChessCom() {
  console.log('\n🔍 Scraping Chess.com...');
  
  try {
    const response = await axios.get('https://www.chess.com/news', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // Chess.com uses article elements
    $('article').each((i, element) => {
      if (i >= config.scraping.maxTweetsPerAccount) return false;

      try {
        const title = $(element).find('h2, .post-preview-title').text().trim();
        const href = $(element).find('a').first().attr('href');
        const link = href || '';
        const imageUrl = $(element).find('img').first().attr('src');
        const excerpt = $(element).find('.post-preview-excerpt, p').first().text().trim();

        if (title && link) {
          articles.push({
            title,
            content: excerpt || title,
            link,
            image_url: imageUrl || null,
            source: 'blog', // Must match DB constraint
            source_website: 'Chess.com',
            published_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error parsing article:', error.message);
      }
    });

    console.log(`✅ Found ${articles.length} articles from Chess.com`);
    return articles;
  } catch (error) {
    console.error(`❌ Error scraping Chess.com:`, error.message);
    return [];
  }
}

/**
 * Scrape ChessBase news
 */
async function scrapeChessBase() {
  console.log('\n🔍 Scraping ChessBase...');
  
  try {
    const response = await axios.get('https://en.chessbase.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // ChessBase news articles - use .blog-news class
    $('.blog-news').each((i, element) => {
      if (i >= config.scraping.maxTweetsPerAccount) return false;

      try {
        // Title is in h1 > a
        const title = $(element).find('h1 a').text().trim();
        const href = $(element).find('a').first().attr('href');
        const link = href ? (href.startsWith('http') ? href : `https://en.chessbase.com${href}`) : '';
        const imageUrl = $(element).find('img').first().attr('src');
        // Get the text content after h1 (the excerpt)
        const excerpt = $(element).find('.blog-header').text().replace(title, '').trim().substring(0, 200);

        if (title && link) {
          articles.push({
            title,
            content: excerpt || title,
            link,
            image_url: imageUrl ? `https://en.chessbase.com${imageUrl}` : null,
            source: 'blog', // Must match DB constraint
            source_website: 'ChessBase',
            published_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error parsing article:', error.message);
      }
    });

    console.log(`✅ Found ${articles.length} articles from ChessBase`);
    return articles;
  } catch (error) {
    console.error(`❌ Error scraping ChessBase:`, error.message);
    return [];
  }
}

/**
 * Scrape Chess24 news
 */
async function scrapeChess24() {
  console.log('\n🔍 Scraping Chess24...');
  
  try {
    const response = await axios.get('https://chess24.com/en/read/news', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // Chess24 news items
    $('.article-preview, .news-item').each((i, element) => {
      if (i >= config.scraping.maxTweetsPerAccount) return false;

      try {
        const title = $(element).find('h2, h3, .title').text().trim();
        const href = $(element).find('a').attr('href');
        const link = href ? (href.startsWith('http') ? href : `https://chess24.com${href}`) : '';
        const imageUrl = $(element).find('img').attr('src');
        const excerpt = $(element).find('.excerpt, p').first().text().trim();

        if (title && link) {
          articles.push({
            title,
            content: excerpt || title,
            link,
            image_url: imageUrl || null,
            source: 'blog', // Must match DB constraint
            source_website: 'Chess24',
            published_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error parsing article:', error.message);
      }
    });

    console.log(`✅ Found ${articles.length} articles from Chess24`);
    return articles;
  } catch (error) {
    console.error(`❌ Error scraping Chess24:`, error.message);
    return [];
  }
}

/**
 * Scrape all news sources
 */
export async function scrapeAllAccounts() {
  console.log('🚀 Starting news scrape...');
  
  const allArticles = [];
  
  // Scrape each source
  const chessCom = await scrapeChessCom();
  allArticles.push(...chessCom);
  
  await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between requests
  
  const chessBase = await scrapeChessBase();
  allArticles.push(...chessBase);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const chess24 = await scrapeChess24();
  allArticles.push(...chess24);
  
  console.log(`\n📊 Total articles scraped: ${allArticles.length}`);
  return allArticles;
}
