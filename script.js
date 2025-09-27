// --- Limbu Dictionary SPA Enhancement ---
// Show selected Limbu letter at top when filtering by letter

const CDN_URL = 'https://cdn.jsdelivr.net/gh/ingsha09/limbu-dictionary-data@refs/heads/main/data.json';

// --- DOM Elements ---
const mainView = document.getElementById('main-view');
const letterIndexView = document.getElementById('letter-index-view');
const letterList = document.getElementById('letter-list');
const container = document.getElementById('dictionary-container');
const loadingIndicator = document.getElementById('loading-indicator');
const initialLoading = document.getElementById('initial-loading');
const searchInput = document.getElementById('search-input');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const viewByLetterToggle = document.getElementById('view-by-letter-toggle');

// --- Selected Letter Header ---
let selectedLetterHeader = document.getElementById('selected-letter-header');
if (!selectedLetterHeader) {
    selectedLetterHeader = document.createElement('div');
    selectedLetterHeader.id = 'selected-letter-header';
    selectedLetterHeader.style.display = 'none';
    selectedLetterHeader.style.marginBottom = '1em';
    mainView.insertBefore(selectedLetterHeader, container);
}

let currentLetter = null; // Tracks currently selected letter

function showLetterHeader(letter) {
    selectedLetterHeader.style.display = 'block';
    selectedLetterHeader.innerHTML = `
        <div class="letter-header">
            <span class="selected-limbu-letter">${letter}</span>
        </div>
    `;
}

function hideLetterHeader() {
    selectedLetterHeader.style.display = 'none';
    selectedLetterHeader.innerHTML = '';
}

// --- Limbu Alphabet & Combining ---
const limbuAlphabet = [
    'ᤀ', 'ᤁ', 'ᤂ', 'ᤃ', 'ᤄ', 'ᤅ', 'ᤆ', 'ᤇ', 'ᤈ', 'ᤉ', 'ᤊ', 'ᤋ', 'ᤌ', 'ᤍ',
    'ᤎ', 'ᤏ', 'ᤐ', 'ᤑ', 'ᤒ', 'ᤓ', 'ᤔ', 'ᤕ', 'ᤖ', 'ᤗ', 'ᤘ', 'ᤙ', 'ᤚ', 'ᤛ', 'ᤜ'
];
const limbuCombining = /[\u1920-\u193F]/;

// --- App State ---
let allEntries = [];
let filteredEntries = [];
let currentIndex = 0;
const BATCH_SIZE = 100;
let currentSearchTerm = '';
let isLoading = false;

// --- Utilities ---
function fixStandaloneLimbu(word) {
    if (!word) return 'Word Missing';
    // If the first character is a combining mark, prepend the base character 'ᤀ'
    if (word.charAt(0).match(limbuCombining)) {
        return 'ᤀ' + word;
    }
    return word;
}

function normalizeForSearch(text) {
    if (!text) return '';
    return fixStandaloneLimbu(text).toLowerCase();
}

function limbuSort(a, b) {
    const getFirstChar = (str) => {
        if (!str) return null;
        for (let i = 0; i < str.length; i++) {
            if (limbuAlphabet.includes(str[i])) return str[i];
        }
        return null;
    };
    const firstCharA = getFirstChar(a[1].dId);
    const firstCharB = getFirstChar(b[1].dId);
    if (!firstCharA) return 1;
    if (!firstCharB) return -1;
    return limbuAlphabet.indexOf(firstCharA) - limbuAlphabet.indexOf(firstCharB);
}

function cleanMeaningText(entry) {
    const rawContent = entry.mean || entry.desc || entry.group || JSON.stringify(entry);
    let cleaned = rawContent.replace(/<\/p>/g, '\n').replace(/<p>/g, '').replace(/\\n/g, '\n').trim();
    return cleaned.replace(/^[,\.\/\|]/, '').trim();
}

function createHeaderLine(entry) {
    // Split multiple Limbu words by common delimiters and process each part
    const primaryWords = (entry.dId || 'Word Missing')
        .split(/[;,.\/]/)
        .map(word => fixStandaloneLimbu(word.trim()))
        .join(' / '); // Re-join with a consistent separator

    const secondaryInfo = entry.desc || '';
    let header = `<span class="limbu-word">${primaryWords}</span>`;
    if (secondaryInfo) {
        header += `<span class="secondary-info">${secondaryInfo}</span>`;
        header += `<button class="tts-btn" data-text="${secondaryInfo}" title="Listen"><i class="bx bx-volume-full"></i></button>`;
    }
    return header;
}

function highlightText(text, term) {
    if (!term || term.length < 2) return text;
    const regex = new RegExp(`(${term})(?![^<]*>|[^<>]*<\/span>)`, 'gi');
    return text.replace(regex, '<span class="highlight">$1</span>');
}

// --- Render Entry ---
function renderEntry(entryTuple, term) {
    const [key, entry] = entryTuple;
    const entryDiv = document.createElement('div');
    entryDiv.className = 'dictionary-entry';
    entryDiv.innerHTML = `
        <div class="entry-header">${highlightText(createHeaderLine(entry), term)}</div>
        <div class="meaning-text">${highlightText(cleanMeaningText(entry), term)}</div>
    `;
    container.appendChild(entryDiv);

    const ttsBtn = entryDiv.querySelector('.tts-btn');
    if (ttsBtn) ttsBtn.addEventListener('click', () => speakNepali(ttsBtn.dataset.text));
}

// --- TTS ---
function speakNepali(text) {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'ne-NP';
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
}

// --- Render Next Batch ---
function renderNextBatch() {
    if (currentIndex >= filteredEntries.length || isLoading) {
        loadingIndicator.textContent = currentIndex >= filteredEntries.length ?
            `End of list. Total entries: ${filteredEntries.length}` : '';
        return;
    }
    isLoading = true;
    const start = currentIndex;
    const end = Math.min(currentIndex + BATCH_SIZE, filteredEntries.length);
    loadingIndicator.style.display = 'block';
    loadingIndicator.innerHTML = '<i class="bx bx-loader bx-spin"></i> Loading more entries...';

    for (let i = start; i < end; i++) renderEntry(filteredEntries[i], currentSearchTerm);
    currentIndex = end;
    isLoading = false;

    loadingIndicator.textContent = currentIndex < filteredEntries.length ?
        `Scroll down to load more... (${currentIndex}/${filteredEntries.length})` :
        `End of list. Total entries: ${filteredEntries.length}`;
}

// --- Search & Filter ---
let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (mainView.style.display === 'none') {
            showMainView();
        }
        applyFilter(searchInput.value);
    }, 300);
});

function applyFilter(term) {
    currentSearchTerm = normalizeForSearch(term.trim());
    window.removeEventListener('scroll', handleScroll);

    if (currentSearchTerm.length < 2) filteredEntries = allEntries;
    else filteredEntries = allEntries.filter(([key, entry]) => {
        const text = [entry.dId, entry.desc, entry.mean, entry.group].map(normalizeForSearch).join(' ');
        return text.includes(currentSearchTerm);
    });

    container.innerHTML = '';
    currentIndex = 0;
    window.addEventListener('scroll', handleScroll);
    renderNextBatch();

    hideLetterHeader();
    currentLetter = null;
}

// --- Scroll Handler ---
function handleScroll() {
    const scrollDistance = document.documentElement.scrollHeight - window.innerHeight - document.documentElement.scrollTop;
    if (scrollDistance < 800 && !isLoading) renderNextBatch();
}

// --- Dark Mode ---
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const icon = darkModeToggle.querySelector('i');
    const isDark = document.body.classList.contains('dark-mode');
    icon.classList.remove(isDark ? 'bx-moon' : 'bx-sun');
    icon.classList.add(isDark ? 'bx-sun' : 'bx-moon');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}
darkModeToggle.addEventListener('click', toggleDarkMode);

// --- Extract Letters & Populate Index ---
function extractUniqueLetters() {
    const letters = allEntries
        .map(([k, e]) => fixStandaloneLimbu(e.dId || '')[0])
        .filter(ch => limbuAlphabet.includes(ch));
    return [...new Set(letters)].sort((a, b) => limbuAlphabet.indexOf(a) - limbuAlphabet.indexOf(b));
}

function populateLetterIndex(letters) {
    letterList.innerHTML = '';
    letters.forEach(letter => {
        const card = document.createElement('div');
        card.className = 'letter-group-card';
        card.textContent = letter;
        card.addEventListener('click', () => {
            history.pushState({ view: 'letter', letter }, '', `#letter-${letter}`);
            showMainView();
            currentLetter = letter;
            showLetterHeader(letter);
            filteredEntries = allEntries.filter(([k, e]) => fixStandaloneLimbu(e.dId || '')[0] === letter);
            currentSearchTerm = '';
            container.innerHTML = '';
            currentIndex = 0;
            renderNextBatch();
        });
        letterList.appendChild(card);
    });
}

// --- HISTORY API & VIEW MANAGEMENT ---
function showMainView() {
    mainView.style.display = 'block';
    letterIndexView.style.display = 'none';
    window.addEventListener('scroll', handleScroll);
    viewByLetterToggle.querySelector('i').className = 'bx bxs-grid-alt';
    if (!currentLetter) hideLetterHeader();
}

function showIndexView() {
    mainView.style.display = 'none';
    letterIndexView.style.display = 'block';
    window.removeEventListener('scroll', handleScroll);
    viewByLetterToggle.querySelector('i').className = 'bx bx-x';
    hideLetterHeader();
    currentLetter = null;
    populateLetterIndex(extractUniqueLetters());
}

viewByLetterToggle.addEventListener('click', () => {
    const isMainViewVisible = mainView.style.display !== 'none';
    if (isMainViewVisible) {
        history.pushState({ view: 'index' }, '', '#index');
        showIndexView();
    } else {
        history.back();
    }
});

window.addEventListener('popstate', (event) => {
    if (!event.state || event.state.view === 'trap') {
        showMainView();
        hideLetterHeader();
        currentLetter = null;
        history.replaceState({ view: 'trap' }, '', window.location.pathname);
    } else if (event.state.view === 'main') {
        showMainView();
        hideLetterHeader();
        currentLetter = null;
    } else if (event.state.view === 'index') {
        showIndexView();
    } else if (event.state.view === 'letter') {
        showMainView();
        currentLetter = event.state.letter;
        showLetterHeader(currentLetter);
        filteredEntries = allEntries.filter(([k, e]) => fixStandaloneLimbu(e.dId || '')[0] === currentLetter);
        currentSearchTerm = '';
        container.innerHTML = '';
        currentIndex = 0;
        renderNextBatch();
    }
});

// --- Initialize App ---
function initApp() {
    if (!history.state || history.state.view !== 'trap') {
        history.replaceState({ view: 'trap' }, '', window.location.pathname);
    }

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        darkModeToggle.querySelector('i').classList.add('bx-sun');
        darkModeToggle.querySelector('i').classList.remove('bx-moon');
    }

    fetch(CDN_URL)
        .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
        .then(data => {
            allEntries = Object.entries(data).sort(limbuSort);
            filteredEntries = allEntries;
            initialLoading.style.display = 'none';

            if (window.location.hash.startsWith('#letter-')) {
                const hashLetter = decodeURIComponent(window.location.hash.replace('#letter-', ''));
                history.replaceState({ view: 'letter', letter: hashLetter }, '', window.location.hash);
                showMainView();
                currentLetter = hashLetter;
                showLetterHeader(hashLetter);
                filteredEntries = allEntries.filter(([k, e]) => fixStandaloneLimbu(e.dId || '')[0] === hashLetter);
                currentSearchTerm = '';
                container.innerHTML = '';
                currentIndex = 0;
                renderNextBatch();
            } else if (window.location.hash === '#index') {
                showIndexView();
            } else {
                showMainView();
                renderNextBatch();
            }

        })
        .catch(err => {
            console.error(err);
            initialLoading.innerHTML = `<p class="error-message">Failed to load data: ${err}</p>`;
            loadingIndicator.style.display = 'none';
        });
}

initApp();
