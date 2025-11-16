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
 * Scrape Lichess Blog
 */
async function scrapeLichess() {
  try {
    console.log('\n🔍 Scraping Lichess Blog...');
    const response = await axios.get('https://lichess.org/blog', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('.ublog-post-card').each((i, element) => {
      if (i >= config.scraping.maxTweetsPerAccount) return false;

      try {
        const title = $(element).find('.ublog-post-card__title').text().trim();
        const href = $(element).attr('href'); // The card itself is an <a> tag
        const link = href ? `https://lichess.org${href}` : '';
        const imageUrl = $(element).find('img').attr('src');
        const excerpt = $(element).find('.ublog-post-card__intro').text().trim();

        if (title && link) {
          articles.push({
            title,
            content: excerpt || title,
            link,
            image_url: imageUrl || null,
            source: 'blog',
            source_website: 'Lichess',
            published_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error parsing article:', error.message);
      }
    });

    console.log(`✅ Found ${articles.length} articles from Lichess`);
    return articles;
  } catch (error) {
    console.error(`❌ Error scraping Lichess:`, error.message);
    return [];
  }
}

/**
 * Scrape FIDE News
 */
async function scrapeFIDE() {
  try {
    console.log('\n🔍 Scraping FIDE News...');
    const response = await axios.get('https://www.fide.com/news', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    $('.post').each((i, element) => {
      if (i >= config.scraping.maxTweetsPerAccount) return false;

      try {
        const title = $(element).find('h3').text().trim();
        const href = $(element).find('a').first().attr('href');
        const link = href || '';
        const imageUrl = $(element).find('img').first().attr('src');
        const excerpt = $(element).find('p').first().text().trim();

        if (title && link) {
          articles.push({
            title,
            content: excerpt || title,
            link,
            image_url: imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https://www.fide.com${imageUrl}`) : null,
            source: 'official',
            source_website: 'FIDE',
            published_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Error parsing article:', error.message);
      }
    });

    console.log(`✅ Found ${articles.length} articles from FIDE`);
    return articles;
  } catch (error) {
    console.error(`❌ Error scraping FIDE:`, error.message);
    return [];
  }
}

/**
 * Scrape all news sources
 */
export async function scrapeAllNews() {
  console.log('🚀 Starting news scrape...');
  const allArticles = [];

  // Scrape Chess.com
  const chessComArticles = await scrapeChessCom();
  allArticles.push(...chessComArticles);

  // Scrape ChessBase
  const chessBaseArticles = await scrapeChessBase();
  allArticles.push(...chessBaseArticles);

  // Scrape FIDE
  const fideArticles = await scrapeFIDE();
  allArticles.push(...fideArticles);

  console.log(`\n📊 Total articles scraped: ${allArticles.length}`);
  return allArticles;
}
