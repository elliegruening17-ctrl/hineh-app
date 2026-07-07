import { MEDITATIONS } from './meditations.js';
import { OPENINGS, REFLECTIONS, CHRIST, CLOSINGS } from './prompts.js';

MEDITATIONS.forEach((meditation) => {
  if (typeof meditation.text === 'string' && meditation.text.startsWith('Scripture text for ')) {
    meditation.text = meditation.text.replace(/^Scripture text for (.+?)\.$/, 'read: $1');
  }
});

const STORAGE_KEY = 'hineh-meditation-state';
const TOTAL_CARDS = 6;

const state = {
  date: null,
  meditationId: null,
  cardIndex: -1,
  completed: false,
  startedAt: null,
  elapsedSeconds: 0
};

const elements = {
  card: document.getElementById('card'),
  stage: document.getElementById('stage'),
  text: document.getElementById('text'),
  prompt: document.getElementById('prompt'),
  reference: document.getElementById('reference'),
  actionButton: document.getElementById('actionButton'),
  progress: document.getElementById('progress'),
  stopwatch: document.getElementById('stopwatch')
};

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js').catch((error) => {
    console.warn('Service worker registration failed:', error);
  });
}

let timerInterval = null;

function getLocalDate() {
  const now = new Date();
  return now.toISOString().slice(0, 10);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const saved = JSON.parse(raw);
    if (saved && saved.date && saved.meditationId) {
      Object.assign(state, saved);
      return true;
    }
  } catch (error) {
    console.warn('Unable to load meditation state', error);
  }
  return false;
}

function getMeditationById(id) {
  return MEDITATIONS.find((item) => item.id === id) || null;
}

function nextMeditationId(currentId) {
  const currentIndex = MEDITATIONS.findIndex((item) => item.id === currentId);
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  return MEDITATIONS[nextIndex] ? MEDITATIONS[nextIndex].id : MEDITATIONS[0].id;
}

function buildMeditationCards(meditation) {
  if (meditation.cards && meditation.cards.length === TOTAL_CARDS) {
    return meditation.cards;
  }

  const scriptureText = meditation.text || `Scripture text for ${meditation.reference}.`;
  const scripturePrompt = scriptureText.startsWith('read:')
    ? scriptureText
    : scriptureText.replace(/^Scripture text for (.+?)\.$/, 'read: $1');

  return [
    {
      stage: 'Opening',
      text: randomPrompt(OPENINGS),
      reference: ''
    },
    {
      stage: 'Scripture',
      text: scripturePrompt,
      reference: meditation.reference || ''
    },
    {
      stage: 'Reflection',
      text: randomPrompt(REFLECTIONS),
      reference: ''
    },
    {
      stage: 'Christ',
      text: randomPrompt(CHRIST),
      reference: ''
    },
    {
      stage: 'Heart',
      text: meditation.heart || `Let your heart receive the quiet comfort of ${meditation.reference}.`,
      reference: ''
    },
    {
      stage: 'Closing',
      text: randomPrompt(CLOSINGS),
      reference: ''
    }
  ];
}

function chooseMeditationForToday() {
  const today = getLocalDate();
  const savedMeditation = getMeditationById(state.meditationId);

  if (state.date === today && savedMeditation) {
    return savedMeditation;
  }

  if (state.date && state.date < today && !state.completed && savedMeditation) {
    state.date = today;
    saveState();
    return savedMeditation;
  }

  const timeOfDayId = meditationIdForTimeOfDay();
  const nextId = getMeditationById(timeOfDayId) ? timeOfDayId : nextMeditationId(state.meditationId);
  state.date = today;
  state.meditationId = nextId;
  state.cardIndex = -1;
  state.completed = false;
  state.startedAt = null;
  state.elapsedSeconds = 0;
  saveState();
  return getMeditationById(nextId);
}

function getCurrentMeditation() {
  return getMeditationById(state.meditationId) || chooseMeditationForToday();
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${secs}`;
}

function updateStopwatch() {
  if (!elements.stopwatch) return;
  const extra = state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;
  elements.stopwatch.textContent = formatTime(state.elapsedSeconds + extra);
}

function startTimer() {
  if (timerInterval) return;
  state.startedAt = Date.now();
  updateStopwatch();
  timerInterval = window.setInterval(updateStopwatch, 1000);
}

function stopTimer() {
  if (!timerInterval) return;
  window.clearInterval(timerInterval);
  timerInterval = null;
  if (state.startedAt) {
    state.elapsedSeconds += Math.floor((Date.now() - state.startedAt) / 1000);
    state.startedAt = null;
    saveState();
  }
  updateStopwatch();
}

function buildProgressDots() {
  if (!elements.progress) return;
  elements.progress.innerHTML = '';
  const active = state.cardIndex >= 0 ? state.cardIndex + 1 : 0;
  for (let i = 0; i < TOTAL_CARDS; i += 1) {
    const dot = document.createElement('span');
    dot.className = `dot${i < active ? ' filled' : ''}`;
    elements.progress.appendChild(dot);
  }
}

function currentGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function meditationIdForTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'meditation-i';
  if (hour < 18) return 'meditation-ii';
  return 'meditation-iii';
}

function randomPrompt(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function showCompletionScreen() {
  if (!elements.stage || !elements.text || !elements.prompt || !elements.reference || !elements.actionButton) return;
  stopTimer();
  state.completed = true;
  saveState();
  elements.stage.textContent = 'Completion';
  elements.text.textContent = 'this meditation is complete';
  elements.prompt.textContent = 'Rest in His peace.';
  elements.reference.textContent = '';
  elements.actionButton.textContent = 'Return Home';
  buildProgressDots();
}

function showHomeScreen() {
  if (!elements.stage || !elements.text || !elements.prompt || !elements.reference || !elements.actionButton) return;
  const meditation = getCurrentMeditation();
  elements.stage.textContent = currentGreeting();
  elements.text.textContent = meditation.title;
  elements.prompt.textContent = randomPrompt(OPENINGS);
  elements.reference.textContent = meditation.reference;
  elements.actionButton.textContent = 'Begin';
  buildProgressDots();
}

function showCard() {
  if (!elements.stage || !elements.text || !elements.prompt || !elements.reference || !elements.actionButton) return;
  const meditation = getCurrentMeditation();
  if (state.completed) {
    showCompletionScreen();
    return;
  }

  const cards = buildMeditationCards(meditation);
  const card = cards[state.cardIndex];
  if (!card) {
    showCompletionScreen();
    return;
  }

  elements.stage.textContent = card.stage;
  elements.text.textContent = card.text;
  if (card.stage === 'Scripture' && card.text?.startsWith('read:')) {
    elements.reference.textContent = card.reference || '';
  } else {
    elements.reference.textContent = '';
  }
  elements.prompt.textContent = '';
  elements.actionButton.textContent = state.cardIndex === cards.length - 1 ? 'Finish' : 'Next';
  buildProgressDots();
}

function showCardTransition(nextState) {
  const cardEl = elements.card;
  if (!cardEl) {
    nextState();
    return;
  }
  cardEl.classList.add('transitioning');
  setTimeout(() => {
    nextState();
    cardEl.classList.remove('transitioning');
  }, 450);
}

function nextCard() {
  const meditation = getCurrentMeditation();
  const cards = buildMeditationCards(meditation);
  if (state.cardIndex >= cards.length - 1) {
    showCardTransition(showCompletionScreen);
    return;
  }
  state.cardIndex += 1;
  saveState();
  showCardTransition(showCard);
}

function resumeOrStart() {
  const saved = loadState();
  const today = getLocalDate();

  if (!saved) {
    chooseMeditationForToday();
    showHomeScreen();
    return;
  }

  if (state.date < today) {
    if (state.completed) {
      chooseMeditationForToday();
      showHomeScreen();
      return;
    }
    state.date = today;
    saveState();
  }

  if (state.completed) {
    showCompletionScreen();
    return;
  }

  if (state.cardIndex < 0 || (state.cardIndex === 0 && state.elapsedSeconds === 0 && state.startedAt === null)) {
    showHomeScreen();
    return;
  }

  showCard();
}

function handleAction() {
  if (!elements.actionButton) return;
  if (state.completed) {
    state.cardIndex = -1;
    state.completed = false;
    state.startedAt = null;
    state.elapsedSeconds = 0;
    saveState();
    showHomeScreen();
    return;
  }

  if (state.cardIndex < 0) {
    state.cardIndex = 0;
    startTimer();
    saveState();
    showCardTransition(showCard);
    return;
  }

  nextCard();
}

function init() {
  if (!elements.actionButton) return;
  elements.actionButton.addEventListener('click', handleAction);
  if (elements.card) {
    elements.card.addEventListener('click', (event) => {
      if (event.target === elements.actionButton) return;
      if (state.completed) return;
      if (state.cardIndex < 0) return;
      nextCard();
    });
  }
  resumeOrStart();
  updateStopwatch();
}

init();
