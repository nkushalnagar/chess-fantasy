/**
 * Test new Sharpe ratio weighting algorithm with real tournament data
 * Fetches PGNs from Lichess API and tests multiple decay parameters
 */

const { spawn } = require('child_process');
const { Chess } = require('chess.js');
const fs = require('fs');
const https = require('https');

// CSV file for real-time results storage
const CSV_FILE = 'sharpe-test-results.csv';

// Test different decay parameters
const DECAY_PARAMS = [1.0, 2.0, 3.0];

// Lichess broadcast IDs for Tata Steel tournaments
const TOURNAMENTS = [
  {
    name: 'Tata Steel Masters 2026',
    broadcastId: '3COxSfdj',
    url: 'https://lichess.org/api/broadcast/3COxSfdj.pgn'
  }
];

/**
 * Initialize CSV file with headers
 */
function initializeCSV() {
  if (!fs.existsSync(CSV_FILE)) {
    const headers = [
      'timestamp',
      'tournament',
      'white_player',
      'black_player',
      'decay_param',
      'white_sharpe_raw',
      'black_sharpe_raw',
      'white_sharpe_clamped',
      'black_sharpe_clamped',
      'white_moves_analyzed',
      'black_moves_analyzed',
      'white_weighted_moves',
      'black_weighted_moves',
      'white_cpchange_mean',
      'white_cpchange_std',
      'white_cpchange_min',
      'white_cpchange_max',
      'black_cpchange_mean',
      'black_cpchange_std',
      'black_cpchange_min',
      'black_cpchange_max'
    ].join(',') + '\n';
    fs.writeFileSync(CSV_FILE, headers);
    console.log(`Created CSV file: ${CSV_FILE}`);
  }
}

/**
 * Append result to CSV in real-time
 */
function appendToCSV(result) {
  const row = [
    new Date().toISOString(),
    result.tournament,
    result.white,
    result.black,
    result.decayParam,
    result.whiteSharpeRaw,
    result.blackSharpeRaw,
    result.whiteSharpeClamped,
    result.blackSharpeClamped,
    result.whiteMovesAnalyzed,
    result.blackMovesAnalyzed,
    result.whiteWeightedMoves,
    result.blackWeightedMoves,
    result.whiteCpChangeMean,
    result.whiteCpChangeStd,
    result.whiteCpChangeMin,
    result.whiteCpChangeMax,
    result.blackCpChangeMean,
    result.blackCpChangeStd,
    result.blackCpChangeMin,
    result.blackCpChangeMax
  ].join(',') + '\n';
  
  fs.appendFileSync(CSV_FILE, row);
  console.log(`✓ Saved to CSV: ${result.white} vs ${result.black} (decay=${result.decayParam})`);
}

/**
 * Fetch PGN from Lichess API
 */
function fetchPGN(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Parse PGN into individual games
 */
function parsePGN(pgnText) {
  const games = [];
  const gameBlocks = pgnText.split(/\n\n(?=\[Event)/).filter(block => block.trim());
  
  for (const block of gameBlocks) {
    const lines = block.split('\n');
    const headers = {};
    let movesStartIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('[') && line.endsWith(']')) {
        const match = line.match(/\[(\w+)\s+"(.*)"\]/);
        if (match) {
          headers[match[1]] = match[2];
        }
      } else if (line && !line.startsWith('[')) {
        movesStartIndex = i;
        break;
      }
    }
    
    const moves = lines.slice(movesStartIndex).join(' ').trim();
    
    if (Object.keys(headers).length > 0 && moves) {
      games.push({ headers, moves, pgn: block });
    }
  }
  
  return games;
}

/**
 * Evaluate position with Stockfish
 */
async function evaluatePosition(fen, depth = 25) {
  return new Promise((resolve, reject) => {
    const stockfishPath = process.env.STOCKFISH_PATH || '/opt/homebrew/bin/stockfish';
    const stockfish = spawn(stockfishPath);
    let output = '';
    let resolved = false;

    stockfish.stdout.on('data', (data) => {
      output += data.toString();
      
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes(`depth ${depth}`) && line.includes('score')) {
          const match = line.match(/score (cp|mate) (-?\d+)/);
          if (match) {
            resolved = true;
            stockfish.kill();
            
            if (match[1] === 'mate') {
              const mateIn = parseInt(match[2]);
              const score = mateIn > 0 ? 10.0 + (1.0 / mateIn) : -10.0 - (1.0 / Math.abs(mateIn));
              resolve(score);
            } else {
              resolve(parseInt(match[2]) / 100.0);
            }
            return;
          }
        }
      }
    });

    stockfish.on('close', () => {
      if (!resolved) {
        reject(new Error('Stockfish closed without result'));
      }
    });

    stockfish.stdin.write('uci\n');
    stockfish.stdin.write('isready\n');
    stockfish.stdin.write(`position fen ${fen}\n`);
    stockfish.stdin.write(`go depth ${depth}\n`);
  });
}

/**
 * Extract move data from PGN
 */
async function extractMoveData(pgn, depth = 30) {
  const chess = new Chess();
  chess.loadPgn(pgn);
  
  const history = chess.history({ verbose: true });
  const movesData = [];
  
  chess.reset();
  
  for (let i = 0; i < history.length; i++) {
    const move = history[i];
    const moveNumber = i + 1;
    
    const numLegalMoves = chess.moves().length;
    chess.move(move);
    
    if (chess.isGameOver()) {
      console.log(`  Skipping terminal position at move ${moveNumber}`);
      continue;
    }
    
    const evalScore = await evaluatePosition(chess.fen(), depth);
    const evalWhitePOV = chess.turn() === 'b' ? -evalScore : evalScore;
    
    movesData.push({
      moveNumber,
      move: move.from + move.to + (move.promotion || ''),
      side: move.color === 'w' ? 'white' : 'black',
      eval: evalWhitePOV,
      cpChange: null,
      numLegalMoves,
      isOnlyLegalMove: numLegalMoves === 1
    });
  }
  
  return movesData;
}

/**
 * NEW: Calculate move weight using Option 1 (minimum distance to zero)
 * Removed the cpChange <= 10 filter from old version
 */
function calculateMoveWeight(moveData, prevEval, currentEval, decayParam) {
  if (moveData.isOnlyLegalMove) return 0.0;
  
  const minDistanceToZero = Math.min(Math.abs(prevEval), Math.abs(currentEval));
  
  // Exponential decay: moves near 0 get weight ~1.0, far from 0 decay toward 0
  return Math.exp(-minDistanceToZero / decayParam);
}

/**
 * Get player moves with cp change
 */
function getPlayerMovesWithCpChange(movesData, color) {
  const playerMoves = [];
  let prevEval = null;
  
  for (const m of movesData) {
    if (m.eval === null || m.side !== color) continue;
    
    const currentEval = color === 'white' ? m.eval : -m.eval;
    
    if (prevEval === null) {
      prevEval = currentEval;
      continue;
    }
    
    const cpChange = (currentEval - prevEval) * 100.0;
    playerMoves.push({ ...m, cpChange, prevEval, currentEval });
    prevEval = currentEval;
  }
  
  return playerMoves;
}

/**
 * Calculate Sharpe ratio with new weighting
 */
function calculatePlayerSharpe(movesData, color, decayParam) {
  const playerMoves = getPlayerMovesWithCpChange(movesData, color);
  
  if (!playerMoves || playerMoves.length < 5) {
    return { 
      sharpe: null, 
      movesAnalyzed: 0, 
      weightedMoves: 0,
      cpChangeMean: null,
      cpChangeStd: null,
      cpChangeMin: null,
      cpChangeMax: null
    };
  }
  
  const weightedReturns = [];
  const weights = [];
  const allCpChanges = [];
  
  for (const move of playerMoves) {
    if (move.cpChange === null) continue;
    
    allCpChanges.push(move.cpChange);
    const weight = calculateMoveWeight(move, move.prevEval, move.currentEval, decayParam);
    
    if (weight > 0) {
      weightedReturns.push(move.cpChange);
      weights.push(weight);
    }
  }
  
  // Calculate cpChange statistics
  const cpChangeMean = allCpChanges.length > 0 
    ? allCpChanges.reduce((a, b) => a + b, 0) / allCpChanges.length 
    : null;
  const cpChangeVar = allCpChanges.length > 0
    ? allCpChanges.reduce((sum, val) => sum + Math.pow(val - cpChangeMean, 2), 0) / allCpChanges.length
    : null;
  const cpChangeStd = cpChangeVar !== null ? Math.sqrt(cpChangeVar) : null;
  const cpChangeMin = allCpChanges.length > 0 ? Math.min(...allCpChanges) : null;
  const cpChangeMax = allCpChanges.length > 0 ? Math.max(...allCpChanges) : null;
  
  if (weightedReturns.length < 3) {
    return { 
      sharpe: null, 
      movesAnalyzed: playerMoves.length, 
      weightedMoves: 0,
      cpChangeMean: cpChangeMean !== null ? cpChangeMean.toFixed(2) : null,
      cpChangeStd: cpChangeStd !== null ? cpChangeStd.toFixed(2) : null,
      cpChangeMin: cpChangeMin !== null ? cpChangeMin.toFixed(2) : null,
      cpChangeMax: cpChangeMax !== null ? cpChangeMax.toFixed(2) : null
    };
  }
  
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    return { 
      sharpe: null, 
      movesAnalyzed: playerMoves.length, 
      weightedMoves: 0,
      cpChangeMean: cpChangeMean !== null ? cpChangeMean.toFixed(2) : null,
      cpChangeStd: cpChangeStd !== null ? cpChangeStd.toFixed(2) : null,
      cpChangeMin: cpChangeMin !== null ? cpChangeMin.toFixed(2) : null,
      cpChangeMax: cpChangeMax !== null ? cpChangeMax.toFixed(2) : null
    };
  }
  
  const weightedMean = weightedReturns.reduce((sum, val, i) => sum + val * weights[i], 0) / totalWeight;
  const weightedVar = weightedReturns.reduce((sum, val, i) => 
    sum + weights[i] * Math.pow(val - weightedMean, 2), 0) / totalWeight;
  const weightedStd = Math.sqrt(weightedVar);
  
  if (weightedStd === 0) {
    return { 
      sharpe: null, 
      movesAnalyzed: playerMoves.length, 
      weightedMoves: weightedReturns.length,
      cpChangeMean: cpChangeMean !== null ? cpChangeMean.toFixed(2) : null,
      cpChangeStd: cpChangeStd !== null ? cpChangeStd.toFixed(2) : null,
      cpChangeMin: cpChangeMin !== null ? cpChangeMin.toFixed(2) : null,
      cpChangeMax: cpChangeMax !== null ? cpChangeMax.toFixed(2) : null
    };
  }
  
  return { 
    sharpe: weightedMean / weightedStd, 
    movesAnalyzed: playerMoves.length, 
    weightedMoves: weightedReturns.length,
    cpChangeMean: cpChangeMean !== null ? cpChangeMean.toFixed(2) : null,
    cpChangeStd: cpChangeStd !== null ? cpChangeStd.toFixed(2) : null,
    cpChangeMin: cpChangeMin !== null ? cpChangeMin.toFixed(2) : null,
    cpChangeMax: cpChangeMax !== null ? cpChangeMax.toFixed(2) : null
  };
}

/**
 * Scale Sharpe to range
 */
function scaleSharpeToRange(sharpe) {
  if (sharpe === null) return 0;
  sharpe = Math.round(sharpe * 100) / 100;
  return Math.max(-1.0, Math.min(1.0, sharpe));
}

/**
 * Analyze a single game with all decay parameters
 */
async function analyzeGame(game, tournamentName) {
  const white = game.headers.White || 'Unknown';
  const black = game.headers.Black || 'Unknown';
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Analyzing: ${white} vs ${black}`);
  console.log(`Tournament: ${tournamentName}`);
  console.log(`${'='.repeat(80)}`);
  
  // Extract move data once
  console.log('Extracting move data with Stockfish...');
  const movesData = await extractMoveData(game.pgn);
  console.log(`✓ Analyzed ${movesData.length} positions`);
  
  // Test each decay parameter
  for (const decayParam of DECAY_PARAMS) {
    console.log(`\nTesting decay parameter: ${decayParam}`);
    
    const whiteResult = calculatePlayerSharpe(movesData, 'white', decayParam);
    const blackResult = calculatePlayerSharpe(movesData, 'black', decayParam);
    
    const result = {
      tournament: tournamentName,
      white,
      black,
      decayParam,
      whiteSharpeRaw: whiteResult.sharpe !== null ? whiteResult.sharpe.toFixed(4) : 'null',
      blackSharpeRaw: blackResult.sharpe !== null ? blackResult.sharpe.toFixed(4) : 'null',
      whiteSharpeClamped: scaleSharpeToRange(whiteResult.sharpe).toFixed(4),
      blackSharpeClamped: scaleSharpeToRange(blackResult.sharpe).toFixed(4),
      whiteMovesAnalyzed: whiteResult.movesAnalyzed,
      blackMovesAnalyzed: blackResult.movesAnalyzed,
      whiteWeightedMoves: whiteResult.weightedMoves,
      blackWeightedMoves: blackResult.weightedMoves,
      whiteCpChangeMean: whiteResult.cpChangeMean || 'null',
      whiteCpChangeStd: whiteResult.cpChangeStd || 'null',
      whiteCpChangeMin: whiteResult.cpChangeMin || 'null',
      whiteCpChangeMax: whiteResult.cpChangeMax || 'null',
      blackCpChangeMean: blackResult.cpChangeMean || 'null',
      blackCpChangeStd: blackResult.cpChangeStd || 'null',
      blackCpChangeMin: blackResult.cpChangeMin || 'null',
      blackCpChangeMax: blackResult.cpChangeMax || 'null'
    };
    
    console.log(`  White: raw=${result.whiteSharpeRaw}, clamped=${result.whiteSharpeClamped}, weighted=${result.whiteWeightedMoves}/${result.whiteMovesAnalyzed}`);
    console.log(`  Black: raw=${result.blackSharpeRaw}, clamped=${result.blackSharpeClamped}, weighted=${result.blackWeightedMoves}/${result.blackMovesAnalyzed}`);
    
    appendToCSV(result);
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('='.repeat(80));
  console.log('SHARPE RATIO WEIGHTING ALGORITHM TEST');
  console.log('='.repeat(80));
  console.log(`Testing decay parameters: ${DECAY_PARAMS.join(', ')}`);
  console.log(`Results will be saved to: ${CSV_FILE}`);
  console.log('='.repeat(80));
  
  initializeCSV();
  
  for (const tournament of TOURNAMENTS) {
    console.log(`\n\nFetching PGNs from ${tournament.name}...`);
    
    try {
      const pgnText = await fetchPGN(tournament.url);
      const games = parsePGN(pgnText);
      
      console.log(`✓ Found ${games.length} games`);
      
      // Analyze ALL games from tournament
      const gamesToAnalyze = games;
      
      for (let i = 0; i < gamesToAnalyze.length; i++) {
        console.log(`\nGame ${i + 1}/${gamesToAnalyze.length}`);
        await analyzeGame(gamesToAnalyze[i], tournament.name);
      }
      
    } catch (error) {
      console.error(`Error fetching ${tournament.name}:`, error.message);
      console.log('Continuing with next tournament...');
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log(`Results saved to: ${CSV_FILE}`);
  console.log('='.repeat(80));
  console.log('\nYou can now analyze the CSV to see:');
  console.log('- Distribution of raw Sharpe values before clamping');
  console.log('- How different decay parameters affect the results');
  console.log('- Which decay parameter gives the best distribution');
}

// Run tests
runTests().catch(console.error);
