# Sharpe Ratio Testing Framework

This folder contains scripts to test the new Sharpe ratio weighting algorithm using real tournament data from Lichess.

## Files

- **test-sharpe-weighting.js** - Main test script that fetches PGNs and calculates Sharpe ratios
- **analyze-sharpe-results.js** - Analysis script to examine CSV results
- **sharpe-test-results.csv** - Output file (created when you run the test)

## Setup Instructions

### On Your Desktop

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/

2. **Install chess.js package**
   ```bash
   npm install chess.js
   ```

3. **Install Stockfish**
   - **macOS**: `brew install stockfish`
   - **Windows**: Download from https://stockfishchess.org/download/
   - **Linux**: `sudo apt-get install stockfish`

4. **Update Stockfish path** (if needed)
   - Open `test-sharpe-weighting.js`
   - Find line 128: `const stockfishPath = process.env.STOCKFISH_PATH || '/opt/homebrew/bin/stockfish';`
   - Update the path to match your Stockfish installation

## Running the Tests

```bash
# Run the main test (will take several hours for 91 games at depth 30)
node test-sharpe-weighting.js

# After completion, analyze the results
node analyze-sharpe-results.js
```

## What It Does

- Fetches 91 games from Tata Steel Masters 2026
- Analyzes each game with Stockfish at depth 30
- Tests 3 decay parameters: 1.0, 2.0, 3.0
- Saves results continuously to CSV (no data loss if interrupted)
- Tracks cpChange statistics (mean, std, min, max)

## Output

The CSV will contain:
- Sharpe ratios (raw & clamped to [-1, 1])
- Move counts (analyzed & weighted)
- cpChange statistics for each player
- All data for each decay parameter tested

## Algorithm Changes

**New weighting function:**
- Removed: cpChange ≤ 10 filter
- Added: Exponential decay based on distance to equality
- Formula: `weight = exp(-min(|prevEval|, |currentEval|) / decayParam)`
- Moves near eval 0.0 get higher weight (more result-shaping)
