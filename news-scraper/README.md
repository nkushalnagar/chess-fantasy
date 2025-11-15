# Chess News Scraper

Automated Twitter scraper for chess news from ChessBase India, Chess.com, and Chess24. Scrapes tweets and uploads them to your Supabase news feed table in real-time.

## Features

- 🔄 **Automated Scraping**: Runs on a configurable interval
- 🚫 **Duplicate Prevention**: Checks for existing posts before inserting
- 🖼️ **Image Support**: Extracts tweet images automatically
- 📊 **Multiple Sources**: Scrapes from 3 major chess news accounts
- ⚡ **Real-time Updates**: Posts appear in your app immediately

## Setup

### 1. Install Dependencies

```bash
cd news-scraper
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here
SCRAPE_INTERVAL_MINUTES=15
MAX_TWEETS_PER_ACCOUNT=10
```

### 3. Database Setup

Make sure your `news_posts` table has a unique constraint on the `link` column to prevent duplicates:

```sql
ALTER TABLE news_posts ADD CONSTRAINT news_posts_link_unique UNIQUE (link);
```

## Usage

### Run Once

```bash
npm start
```

### Development Mode (Auto-restart)

```bash
npm run dev
```

### Run as Background Service

On macOS/Linux:
```bash
nohup npm start > scraper.log 2>&1 &
```

## Configuration

### Twitter Accounts

Edit `config.js` to add/remove accounts:

```javascript
accounts: [
  {
    handle: 'ChessbaseIndia',
    url: 'https://x.com/ChessbaseIndia',
    source: 'ChessBase India',
  },
  // Add more accounts here
]
```

### Scraping Settings

- `SCRAPE_INTERVAL_MINUTES`: How often to scrape (default: 15 minutes)
- `MAX_TWEETS_PER_ACCOUNT`: Maximum tweets per account (default: 10)

## How It Works

1. **Scrape**: Uses Puppeteer to load Twitter pages and extract tweet data
2. **Parse**: Extracts text, links, timestamps, and images from tweets
3. **Check**: Verifies if post already exists in database
4. **Upload**: Inserts new posts into Supabase `news_posts` table
5. **Repeat**: Runs on configured interval

## Output

The scraper provides detailed console output:

```
═══════════════════════════════════════
♟️  Chess News Scraper
═══════════════════════════════════════
⏰ 11/15/2025, 6:00:00 PM

🔍 Scraping ChessBase India...
📱 Navigating to https://x.com/ChessbaseIndia...
✅ Found 10 tweets from ChessBase India

📤 Uploading to Supabase...
✅ Added: Gukesh wins World Championship...
⏭️  Skipped (duplicate): Magnus draws with...

═══════════════════════════════════════
📊 Summary:
   • New posts: 8
   • Skipped (duplicates): 2
   • Total scraped: 10
═══════════════════════════════════════
```

## Troubleshooting

### Puppeteer Issues

If Puppeteer fails to launch:
```bash
# macOS
brew install chromium

# Set environment variable
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Rate Limiting

If Twitter blocks requests:
- Increase `SCRAPE_INTERVAL_MINUTES`
- Reduce `MAX_TWEETS_PER_ACCOUNT`
- Add delays between accounts

## Production Deployment

### Option 1: PM2 (Recommended)

```bash
npm install -g pm2
pm2 start index.js --name chess-news-scraper
pm2 save
pm2 startup
```

### Option 2: Docker

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine
RUN apk add --no-cache chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "start"]
```

### Option 3: Cron Job

Add to crontab:
```bash
*/15 * * * * cd /path/to/news-scraper && node index.js >> scraper.log 2>&1
```

## License

MIT
