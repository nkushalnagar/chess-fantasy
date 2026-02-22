/**
 * Analyze Sharpe ratio test results from CSV
 * Shows distribution statistics for each decay parameter
 */

const fs = require('fs');

const CSV_FILE = 'sharpe-test-results.csv';

/**
 * Parse CSV file
 */
function parseCSV(filename) {
  const content = fs.readFileSync(filename, 'utf-8');
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    data.push(row);
  }
  
  return data;
}

/**
 * Calculate statistics for an array of numbers
 */
function calculateStats(values) {
  if (values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  
  return { count: values.length, min, max, mean, median, std, q1, q3 };
}

/**
 * Analyze results by decay parameter
 */
function analyzeByDecayParam(data) {
  const byDecay = {};
  
  // Group by decay parameter
  for (const row of data) {
    const decay = row.decay_param;
    if (!byDecay[decay]) {
      byDecay[decay] = {
        whiteRaw: [],
        blackRaw: [],
        whiteClamped: [],
        blackClamped: [],
        whiteWeightedPct: [],
        blackWeightedPct: []
      };
    }
    
    const whiteRaw = parseFloat(row.white_sharpe_raw);
    const blackRaw = parseFloat(row.black_sharpe_raw);
    const whiteClamped = parseFloat(row.white_sharpe_clamped);
    const blackClamped = parseFloat(row.black_sharpe_clamped);
    
    if (!isNaN(whiteRaw)) {
      byDecay[decay].whiteRaw.push(whiteRaw);
      byDecay[decay].whiteClamped.push(whiteClamped);
      
      const whiteWeightedPct = parseInt(row.white_weighted_moves) / parseInt(row.white_moves_analyzed) * 100;
      byDecay[decay].whiteWeightedPct.push(whiteWeightedPct);
    }
    
    if (!isNaN(blackRaw)) {
      byDecay[decay].blackRaw.push(blackRaw);
      byDecay[decay].blackClamped.push(blackClamped);
      
      const blackWeightedPct = parseInt(row.black_weighted_moves) / parseInt(row.black_moves_analyzed) * 100;
      byDecay[decay].blackWeightedPct.push(blackWeightedPct);
    }
  }
  
  return byDecay;
}

/**
 * Print analysis report
 */
function printReport(data) {
  console.log('='.repeat(100));
  console.log('SHARPE RATIO TEST RESULTS ANALYSIS');
  console.log('='.repeat(100));
  console.log(`Total games analyzed: ${data.length / 5} (${data.length} total rows with 5 decay params each)`);
  console.log('='.repeat(100));
  
  const byDecay = analyzeByDecayParam(data);
  
  for (const [decay, values] of Object.entries(byDecay).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`DECAY PARAMETER: ${decay}`);
    console.log('='.repeat(100));
    
    // Raw Sharpe statistics
    const whiteRawStats = calculateStats(values.whiteRaw);
    const blackRawStats = calculateStats(values.blackRaw);
    const allRawStats = calculateStats([...values.whiteRaw, ...values.blackRaw]);
    
    console.log('\n--- RAW SHARPE RATIOS (before clamping) ---');
    console.log(`White: n=${whiteRawStats.count}, mean=${whiteRawStats.mean.toFixed(3)}, std=${whiteRawStats.std.toFixed(3)}, median=${whiteRawStats.median.toFixed(3)}`);
    console.log(`       min=${whiteRawStats.min.toFixed(3)}, q1=${whiteRawStats.q1.toFixed(3)}, q3=${whiteRawStats.q3.toFixed(3)}, max=${whiteRawStats.max.toFixed(3)}`);
    console.log(`Black: n=${blackRawStats.count}, mean=${blackRawStats.mean.toFixed(3)}, std=${blackRawStats.std.toFixed(3)}, median=${blackRawStats.median.toFixed(3)}`);
    console.log(`       min=${blackRawStats.min.toFixed(3)}, q1=${blackRawStats.q1.toFixed(3)}, q3=${blackRawStats.q3.toFixed(3)}, max=${blackRawStats.max.toFixed(3)}`);
    console.log(`Combined: n=${allRawStats.count}, mean=${allRawStats.mean.toFixed(3)}, std=${allRawStats.std.toFixed(3)}, median=${allRawStats.median.toFixed(3)}`);
    console.log(`          min=${allRawStats.min.toFixed(3)}, q1=${allRawStats.q1.toFixed(3)}, q3=${allRawStats.q3.toFixed(3)}, max=${allRawStats.max.toFixed(3)}`);
    
    // Clamped Sharpe statistics
    const whiteClampedStats = calculateStats(values.whiteClamped);
    const blackClampedStats = calculateStats(values.blackClamped);
    const allClampedStats = calculateStats([...values.whiteClamped, ...values.blackClamped]);
    
    console.log('\n--- CLAMPED SHARPE RATIOS (after clamping to [-1, 1]) ---');
    console.log(`White: n=${whiteClampedStats.count}, mean=${whiteClampedStats.mean.toFixed(3)}, std=${whiteClampedStats.std.toFixed(3)}, median=${whiteClampedStats.median.toFixed(3)}`);
    console.log(`Black: n=${blackClampedStats.count}, mean=${blackClampedStats.mean.toFixed(3)}, std=${blackClampedStats.std.toFixed(3)}, median=${blackClampedStats.median.toFixed(3)}`);
    console.log(`Combined: n=${allClampedStats.count}, mean=${allClampedStats.mean.toFixed(3)}, std=${allClampedStats.std.toFixed(3)}, median=${allClampedStats.median.toFixed(3)}`);
    
    // Percentage of values that hit the clamp
    const whiteClampedCount = values.whiteRaw.filter((v, i) => Math.abs(v) > 1.0).length;
    const blackClampedCount = values.blackRaw.filter((v, i) => Math.abs(v) > 1.0).length;
    const totalClampedCount = whiteClampedCount + blackClampedCount;
    const totalCount = values.whiteRaw.length + values.blackRaw.length;
    
    console.log(`\n--- CLAMPING IMPACT ---`);
    console.log(`Values exceeding [-1, 1]: ${totalClampedCount}/${totalCount} (${(totalClampedCount/totalCount*100).toFixed(1)}%)`);
    console.log(`  White: ${whiteClampedCount}/${values.whiteRaw.length} (${(whiteClampedCount/values.whiteRaw.length*100).toFixed(1)}%)`);
    console.log(`  Black: ${blackClampedCount}/${values.blackRaw.length} (${(blackClampedCount/values.blackRaw.length*100).toFixed(1)}%)`);
    
    // Weighted moves percentage
    const whiteWeightedStats = calculateStats(values.whiteWeightedPct);
    const blackWeightedStats = calculateStats(values.blackWeightedPct);
    
    console.log('\n--- WEIGHTED MOVES (% of moves that received non-zero weight) ---');
    console.log(`White: mean=${whiteWeightedStats.mean.toFixed(1)}%, median=${whiteWeightedStats.median.toFixed(1)}%, range=${whiteWeightedStats.min.toFixed(1)}%-${whiteWeightedStats.max.toFixed(1)}%`);
    console.log(`Black: mean=${blackWeightedStats.mean.toFixed(1)}%, median=${blackWeightedStats.median.toFixed(1)}%, range=${blackWeightedStats.min.toFixed(1)}%-${blackWeightedStats.max.toFixed(1)}%`);
  }
  
  console.log('\n' + '='.repeat(100));
  console.log('RECOMMENDATIONS');
  console.log('='.repeat(100));
  console.log('Look for a decay parameter where:');
  console.log('  1. Raw Sharpe values have reasonable spread (not too compressed)');
  console.log('  2. Low percentage of values hit the [-1, 1] clamp (ideally <10%)');
  console.log('  3. Weighted moves percentage is reasonable (not filtering out too many moves)');
  console.log('  4. Mean Sharpe is close to 0 (balanced, not systematically biased)');
  console.log('='.repeat(100));
}

/**
 * Main function
 */
function main() {
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`Error: ${CSV_FILE} not found. Run test-sharpe-weighting.js first.`);
    process.exit(1);
  }
  
  const data = parseCSV(CSV_FILE);
  
  if (data.length === 0) {
    console.error('Error: CSV file is empty or has no data rows.');
    process.exit(1);
  }
  
  printReport(data);
}

main();
