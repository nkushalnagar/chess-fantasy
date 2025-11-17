-- Drop the old constraint
ALTER TABLE news_posts DROP CONSTRAINT IF EXISTS news_posts_source_check;

-- Add new constraint with actual website names
ALTER TABLE news_posts ADD CONSTRAINT news_posts_source_check 
  CHECK (source IN ('Chess.com', 'ChessBase', 'FIDE', 'Lichess', 'twitter', 'blog', 'official', 'other'));
