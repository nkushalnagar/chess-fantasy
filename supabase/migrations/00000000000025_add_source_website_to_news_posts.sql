-- ============================================
-- ADD SOURCE_WEBSITE TO NEWS_POSTS
-- ============================================
-- This tracks the specific website (Chess.com, ChessBase, etc.)
-- while 'source' remains the general category (blog, twitter, etc.)

-- Add source_website column
ALTER TABLE news_posts
  ADD COLUMN source_website TEXT;

-- Add comment
COMMENT ON COLUMN news_posts.source_website IS 'Specific website source: Chess.com, ChessBase, Chess24, etc.';

-- Update existing posts to have source_website
-- Since all existing posts are from 'blog', we can set them to 'Unknown' or leave NULL
UPDATE news_posts SET source_website = 'Unknown' WHERE source_website IS NULL;
