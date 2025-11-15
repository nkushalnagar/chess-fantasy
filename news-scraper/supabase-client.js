import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Create Supabase client with service role key for admin access
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Insert or update a news post in the database
 * @param {Object} post - The post data
 * @returns {Promise<Object>} The inserted/updated post
 */
export async function upsertNewsPost(post) {
  const { data, error } = await supabase
    .from('news_posts')
    .upsert(
      {
        title: post.title,
        content: post.content,
        source: post.source,
        link: post.link,
        image_url: post.image_url,
        published_at: post.published_at,
      },
      {
        onConflict: 'link', // Avoid duplicates based on link
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting news post:', error);
    throw error;
  }

  return data;
}

/**
 * Check if a post already exists by link
 * @param {string} link - The post link
 * @returns {Promise<boolean>} Whether the post exists
 */
export async function postExists(link) {
  const { data, error } = await supabase
    .from('news_posts')
    .select('id')
    .eq('link', link)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "not found" error
    console.error('Error checking post existence:', error);
    throw error;
  }

  return !!data;
}
