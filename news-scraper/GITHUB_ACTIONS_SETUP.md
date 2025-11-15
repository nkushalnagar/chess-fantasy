# GitHub Actions Setup Guide

## Step-by-Step Instructions

### 1. Push Code to GitHub

If you haven't already, push your project to GitHub:

```bash
cd "/Users/nirup/Downloads/Chess Project"
git add .
git commit -m "Add chess news scraper with GitHub Actions"
git push origin main
```

### 2. Add GitHub Secrets

Go to your GitHub repository and add these secrets:

1. Navigate to: **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add these two secrets:

**Secret 1:**
- Name: `SUPABASE_URL`
- Value: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)

**Secret 2:**
- Name: `SUPABASE_SERVICE_KEY`
- Value: Your Supabase service role key (from Supabase Dashboard → Settings → API)

### 3. Enable GitHub Actions

1. Go to your repository on GitHub
2. Click the **"Actions"** tab
3. If prompted, click **"I understand my workflows, go ahead and enable them"**

### 4. Test the Workflow

**Option A: Wait for automatic run** (next 15-minute mark)

**Option B: Trigger manually** (recommended for testing):
1. Go to **Actions** tab
2. Click **"Scrape Chess News"** workflow
3. Click **"Run workflow"** button
4. Click green **"Run workflow"** button
5. Watch it run in real-time!

### 5. Monitor Logs

Click on any workflow run to see detailed logs:
- Which tweets were scraped
- Which were new vs duplicates
- Any errors that occurred

---

## How It Works

```
Every 15 minutes:
  ┌─────────────────────────────────────┐
  │ GitHub Actions starts a VM          │
  │ • Installs Node.js & Chromium       │
  │ • Installs npm dependencies         │
  │ • Runs scraper once                 │
  │ • Uploads new posts to Supabase     │
  │ • Shuts down VM                     │
  └─────────────────────────────────────┘
```

---

## Troubleshooting

### Workflow not running?
- Check if Actions are enabled in repo settings
- Verify secrets are added correctly
- Check the "Actions" tab for error messages

### Scraper failing?
- View logs in Actions tab
- Common issues:
  - Wrong Supabase credentials
  - Twitter changed their HTML structure
  - Rate limiting

### Want to change frequency?
Edit `.github/workflows/scrape-news.yml`:
```yaml
schedule:
  - cron: '*/30 * * * *'  # Every 30 minutes
  - cron: '0 * * * *'     # Every hour
  - cron: '0 */6 * * *'   # Every 6 hours
```

---

## Cost

**100% FREE!** ✅

- GitHub Actions: 2000 minutes/month free
- Your usage: ~96 minutes/month
- Plenty of headroom!

---

## Stopping the Scraper

To pause/stop:
1. Go to `.github/workflows/scrape-news.yml`
2. Comment out the schedule section:
```yaml
# schedule:
#   - cron: '*/15 * * * *'
```
3. Commit and push

Or delete the workflow file entirely.

---

## Next Steps

Once it's running:
1. Check your `news_posts` table in Supabase
2. Posts should appear every 15 minutes
3. Your app's news feed will automatically show them!

🎉 **That's it! Your scraper is now running 24/7 in the cloud!**
