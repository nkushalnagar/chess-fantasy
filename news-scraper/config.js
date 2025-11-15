import dotenv from 'dotenv';

dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  twitter: {
    accounts: [
      {
        handle: 'ChessbaseIndia',
        url: 'https://x.com/ChessbaseIndia',
        source: 'ChessBase India',
      },
      {
        handle: 'chesscom',
        url: 'https://x.com/chesscom',
        source: 'Chess.com',
      },
      {
        handle: 'chess24com',
        url: 'https://x.com/chess24com',
        source: 'Chess24',
      },
    ],
  },
  scraping: {
    intervalMinutes: parseInt(process.env.SCRAPE_INTERVAL_MINUTES || '15'),
    maxTweetsPerAccount: parseInt(process.env.MAX_TWEETS_PER_ACCOUNT || '10'),
    headless: true,
  },
};
