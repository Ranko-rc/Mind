const gameCards = document.querySelectorAll('.exercise-card');
const gameModes = {
  pattern: document.getElementById('patternGame'),
  recall: document.getElementById('recallGame'),
  echo: document.getElementById('echoGame')
};
const gameTitle = document.getElementById('gameTitle');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const resetStatsBtn = document.getElementById('resetStatsBtn');

const patternBoard = document.getElementById('patternBoard');
const recallDisplay = document.getElementById('recallDisplay');
const recallInput = document.getElementById('recallInput');
const recallSubmit = document.getElementById('recallSubmit');
const patternSubmit = document.getElementById('patternSubmit');
const echoSubmit = document.getElementById('echoSubmit');
const colorSequence = document.getElementById('colorSequence');
const colorOptions = document.querySelectorAll('.color-option');

const statEls = {
  games: document.getElementById('gamesCount'),
  pattern: document.getElementById('patternBestValue'),
  recall: document.getElementById('recallBestValue'),
  echo: document.getElementById('echoBestValue')
};

const STORAGE_KEY = 'mind-game-stats';
const colorPalette = ['purple', 'cyan', 'yellow', 'pink'];
const gridColors = ['purple', 'cyan', 'yellow', 'pink'];

// Výchozí hodnoty statistik používané při prvním spuštění nebo resetu hry.
const defaultStats = {
  totalGames: 0,
  patternBest: 0,
  recallBest: 0,
  echoBest: 0,
  patternRounds: 0,
  recallRounds: 0,
  echoRounds: 0,
  recallCorrect: 0,
  patternCorrect: 0,
  echoCorrect: 0
};

let stats = loadStats();
let activeGame = 'pattern';
let patternSequence = [];
let recallSequence = [];
let echoSequence = [];
let echoAnswer = [];
let echoRoundLength = 2;
let patternAnswer = [];
let isPlayingPattern = false;
let isPlayingEcho = false;
let recallHideTimer = null;
let echoGridCells = [];
let echoResolved = false;

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function loadStats() {
  // Statistiky se uchovávají v prohlížeči, aby zůstaly zachované po obnovení stránky.
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return { ...defaultStats };

  try {
    return { ...defaultStats, ...JSON.parse(saved) };
  } catch (error) {
    return { ...defaultStats };
  }
}

function saveStats() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

function updateStatsDisplay() {
  // Karty zobrazují počet správně vyřešených hádanek pro jednotlivé hry.
  statEls.games.textContent = String(stats.totalGames);
  statEls.pattern.textContent = String(stats.patternCorrect);
  statEls.recall.textContent = String(stats.recallCorrect);
  statEls.echo.textContent = String(stats.echoCorrect);
}

function resetStats() {
  // Reset je chráněný potvrzením, aby nedošlo k náhodnému smazání výsledků.
  if (!window.confirm('Reset all game statistics?')) return;

  stats = { ...defaultStats };
  saveStats();
  updateStatsDisplay();
  statusText.textContent = 'Statistics reset.';
}

function updateRoundStats(gameName, sequenceLength, correct = false) {
  // Body se přičítají pouze za správně potvrzenou odpověď.
  if (correct) {
    stats.totalGames += 1;
  }

  if (gameName === 'pattern') {
    stats.patternRounds += 1;
    stats.patternBest = Math.max(stats.patternBest, sequenceLength);
    if (correct) stats.patternCorrect += 1;
  }

  if (gameName === 'recall') {
    stats.recallRounds += 1;
    stats.recallBest = Math.max(stats.recallBest, sequenceLength);
    if (correct) stats.recallCorrect += 1;
  }

  if (gameName === 'echo') {
    stats.echoRounds += 1;
    stats.echoBest = Math.max(stats.echoBest, sequenceLength);
    if (correct) stats.echoCorrect += 1;
  }

  saveStats();
  updateStatsDisplay();
}

function renderPatternBoard() {
  // Vytvoření herní mřížky a obsluha výběru políček hráčem.
  patternBoard.innerHTML = '';
  patternAnswer = [];

  for (let i = 0; i < 16; i += 1) {
    const cell = document.createElement('button');
    cell.className = 'grid-cell';
    cell.type = 'button';
    cell.dataset.index = String(i);
    cell.addEventListener('click', () => {
      if (!isPlayingPattern && activeGame === 'pattern') {
        cell.classList.toggle('active');

        const index = Number(cell.dataset.index);
        if (cell.classList.contains('active')) {
          patternAnswer.push(index);
        } else {
          patternAnswer = patternAnswer.filter((item) => item !== index);
        }
      }
    });
    patternBoard.appendChild(cell);
  }
}

function selectGame(game) {
  activeGame = game;
  gameTitle.textContent = game === 'pattern' ? 'Pattern Grid' : game === 'recall' ? 'Number Recall' : 'Color Echo';

  gameCards.forEach((card) => {
    card.classList.toggle('active', card.dataset.game === game);
  });

  Object.entries(gameModes).forEach(([key, mode]) => {
    mode.classList.toggle('active', key === game);
  });
}

gameCards.forEach((card) => {
  card.addEventListener('click', () => selectGame(card.dataset.game));
});

function flashCells(indices, delay = 420) {
  // Postupné rozsvícení vzoru před tím, než začne hráč odpovídat.
  isPlayingPattern = true;
  const cells = [...patternBoard.children];
  let step = 0;

  const tick = () => {
    cells.forEach((cell) => cell.classList.remove('active'));
    if (step < indices.length) {
      cells[indices[step]].classList.add('active');
      step += 1;
      setTimeout(tick, delay);
    } else {
      setTimeout(() => {
        cells.forEach((cell) => cell.classList.remove('active'));
        isPlayingPattern = false;
        statusText.textContent = 'Now repeat the pattern by selecting the glowing cells.';
      }, 250);
    }
  };

  tick();
}

function generatePatternSequence() {
  const next = [];
  const length = 4 + Math.floor(Math.random() * 2);
  for (let i = 0; i < length; i += 1) {
    next.push(Math.floor(Math.random() * 16));
  }
  patternSequence = next;
  stats.patternBest = Math.max(stats.patternBest, next.length);
  saveStats();
  updateStatsDisplay();
  return next;
}

function startPatternRound() {
  patternAnswer = [];
  renderPatternBoard();
  statusText.textContent = 'Memorize the pattern...';
  const sequence = generatePatternSequence();
  flashCells(sequence);
}

function checkPatternAnswer() {
  // Odpověď Pattern Grid se vyhodnotí až po stisknutí tlačítka Correct.
  if (activeGame !== 'pattern') {
    return;
  }

  if (isPlayingPattern) {
    statusText.textContent = 'Wait until the pattern is finished showing.';
    return;
  }

  const normalizedAnswer = [...new Set(patternAnswer)].sort((a, b) => a - b);
  const normalizedPattern = [...new Set(patternSequence)].sort((a, b) => a - b);
  const isCorrect = normalizedAnswer.length === normalizedPattern.length && normalizedAnswer.every((value, index) => value === normalizedPattern[index]);

  updateRoundStats('pattern', patternSequence.length, isCorrect);

  if (isCorrect) {
    statusText.textContent = 'Correct pattern! Great memory.';
  } else {
    statusText.textContent = `Not quite. The correct pattern was ${patternSequence.join(', ')}.`;
  }

  setTimeout(() => {
    startPatternRound();
  }, 1200);
}


// Number Recall: zobrazí čísla na dvě sekundy a potom je skryje.
function startRecallRound() {
  if (recallHideTimer) {
    clearTimeout(recallHideTimer);
  }

  const numbers = ['2', '8', '4', '6', '9', '1', '3', '7'];
  const length = 4 + Math.floor(Math.random() * 3);
  recallSequence = Array.from({ length }, () => numbers[Math.floor(Math.random() * numbers.length)]).join('');
  stats.recallBest = Math.max(stats.recallBest, recallSequence.length);
  saveStats();
  updateStatsDisplay();

  recallDisplay.textContent = recallSequence;
  recallInput.value = '';
  recallInput.focus();
  statusText.textContent = 'Memorize the digits...';

  recallHideTimer = setTimeout(() => {
    recallDisplay.textContent = '';
    statusText.textContent = 'Repeat the digits in the same order.';
  }, 2000);
}

function checkRecall() {
  // Kontrola čísel probíhá pouze po odeslání odpovědi tlačítkem Correct.
  const answer = recallInput.value.trim();
  if (!answer.length) {
    statusText.textContent = 'Type the sequence first.';
    return;
  }

  const isCorrect = answer === recallSequence;
  updateRoundStats('recall', recallSequence.length, isCorrect);

  statusText.textContent = isCorrect
    ? 'Correct! Excellent recall.'
    : `Not quite. The correct sequence was ${recallSequence}.`;
  recallInput.value = '';
}

function checkEchoAnswer() {
  // Barevná sekvence se započítá až po dokončení pořadí a potvrzení tlačítkem.
  if (activeGame !== 'echo') return;

  if (echoResolved) return;

  if (isPlayingEcho) {
    statusText.textContent = 'Wait until the sequence is finished showing.';
    return;
  }

  if (echoAnswer.length !== echoSequence.length) {
    statusText.textContent = `Select all ${echoSequence.length} tiles before checking.`;
    return;
  }

  const isCorrect = echoAnswer.every((entry, index) => entry === echoSequence[index]);
  echoResolved = true;
  updateRoundStats('echo', echoSequence.length, isCorrect);

  if (isCorrect) {
    echoRoundLength += 1;
    statusText.textContent = `Perfect! ${echoSequence.length} tiles remembered. Next round adds one more.`;
  } else {
    echoRoundLength = 2;
    statusText.textContent = `Close — the correct order was ${echoSequence.map((item) => item + 1).join(', ')}`;
  }

  setTimeout(() => buildEchoSequence(), 1200);
}

function buildEchoSequence() {
  // Každé kolo vybere náhodné pořadí políček; délka začíná na dvou a postupně roste.
  const targetLength = Math.max(2, echoRoundLength);
  const possibleTiles = shuffle([0, 1, 2, 3]);
  echoSequence = possibleTiles.slice(0, targetLength);
  echoResolved = false;
  stats.echoBest = Math.max(stats.echoBest, echoSequence.length);
  saveStats();
  updateStatsDisplay();
  echoAnswer = [];

  colorSequence.innerHTML = '';
  colorSequence.classList.add('grid-2x2');
  echoGridCells = Array.from({ length: 4 }, (_, index) => {
    const box = document.createElement('div');
    box.className = `seq-box ${gridColors[index]}`;
    box.dataset.index = String(index);
    box.dataset.color = gridColors[index];
    box.style.cursor = 'pointer';
    box.style.opacity = '1';
    box.style.transform = 'scale(1)';
    box.style.boxShadow = 'none';
    colorSequence.appendChild(box);
    return box;
  });

  statusText.textContent = 'Watch the sequence of glowing tiles.';
  isPlayingEcho = true;

  let step = 0;
  const revealNext = () => {
    // Hráč sleduje blikající políčka postupně, vždy jedno po druhém.
    echoGridCells.forEach((box) => {
      box.classList.remove('glow');
      box.classList.add('dimmed');
    });

    if (step < echoSequence.length) {
      const currentIndex = echoSequence[step];
      const currentBox = echoGridCells[currentIndex];
      currentBox.classList.remove('dimmed');
      currentBox.classList.add('glow');
      step += 1;
      setTimeout(revealNext, 500);
    } else {
      setTimeout(() => {
        echoGridCells.forEach((box) => {
          box.classList.remove('glow', 'dimmed');
        });
        statusText.textContent = 'Repeat the glowing order by clicking the tiles.';
        isPlayingEcho = false;
      }, 320);
    }
  };

  revealNext();

  echoGridCells.forEach((box) => {
    box.onclick = () => {
      // Kliknutí pouze uloží volbu; správnost určí až tlačítko Correct.
      if (isPlayingEcho) return;

      const index = Number(box.dataset.index);
      echoAnswer.push(index);
      box.classList.add('clicked');
      setTimeout(() => {
        box.classList.remove('clicked');
      }, 180);

      if (echoAnswer.length === echoSequence.length) {
        statusText.textContent = 'Answer complete. Click Correct to check it.';
      }
    };
  });
}

startBtn.addEventListener('click', () => {
  if (activeGame === 'pattern') {
    startPatternRound();
    return;
  }

  if (activeGame === 'recall') {
    startRecallRound();
    return;
  }

  echoRoundLength = 2;
  buildEchoSequence();
});

patternSubmit.addEventListener('click', checkPatternAnswer);
recallSubmit.addEventListener('click', checkRecall);
echoSubmit.addEventListener('click', checkEchoAnswer);
resetStatsBtn.addEventListener('click', resetStats);
recallInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    checkRecall();
  }
});

renderPatternBoard();
updateStatsDisplay();
selectGame('pattern');
statusText.textContent = 'Ready for the next challenge.';
