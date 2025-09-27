// --- Limbu Dictionary SPA ---

const CDN_URL = 'https://cdn.jsdelivr.net/gh/ingsha09/limbu-dictionary-data@main/data.json';

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

let currentLetter = null;

function showLetterHeader(letter) {
    selectedLetterHeader.style.display = 'block';
    selectedLetterHeader.innerHTML = `<div class="letter-header"><span class="selected-limbu-letter" lang="lif">${letter}</span></div>`;
}

function hideLetterHeader() {
    selectedLetterHeader.style.display = 'none';
    selectedLetterHeader.innerHTML = '';
}

// --- Limbu Alphabet ---
const limbuAlphabet = ['ᤀ', 'ᤁ', 'ᤂ', 'ᤃ', 'ᤄ', 'ᤅ', 'ᤆ', 'ᤇ', 'ᤈ', 'ᤉ', 'ᤊ', 'ᤋ', 'ᤌ', 'ᤍ', 'ᤎ', 'ᤏ', 'ᤐ', 'ᤑ', 'ᤒ', 'ᤓ', 'ᤔ', 'ᤕ', 'ᤖ', 'ᤗ', 'ᤘ', 'ᤙ', 'ᤚ', 'ᤛ', 'ᤜ'];

// --- App State ---
let allEntries = [];
let filteredEntries = [];
let currentIndex = 0;
const BATCH_SIZE = 100;
let currentSearchTerm = '';
let originalSearchTerm = '';
let isLoading = false;

// --- Utilities ---
function fixStandaloneLimbu(word) {
    if (!word) return 'Word Missing';
    return word.replace(/(^|\s)([\u1920-\u193F])/g, '$1ᤀ$2');
}

function normalizeForSearch(text) {
    if (!text) return '';
    return fixStandaloneLimbu(text).toLowerCase();
}

function limbuSort(a, b) {
    const getFirstChar = str => {
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

function highlightText(text, term) {
    if (!term || !text) {
        return text || '';
    }
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (escapedTerm === '') {
        return text;
    }
    const hasLatinChars = /[a-zA-Z]/.test(escapedTerm);
    const flags = hasLatinChars ? 'gi' : 'g';
    const regex = new RegExp(escapedTerm, flags);
    return text.replace(regex, `<span class="highlight">$&</span>`);
}

function renderEntry(entryTuple, term) {
    const [key, entry] = entryTuple;
    const entryDiv = document.createElement('div');
    entryDiv.className = 'dictionary-entry';
    const limbuWordText = fixStandaloneLimbu(entry.dId || 'Word Missing');
    const secondaryInfoText = entry.desc || '';
    const meaningText = cleanMeaningText(entry);
    const highlightedLimbu = highlightText(limbuWordText, term);
    const highlightedSecondary = highlightText(secondaryInfoText, term);
    const highlightedMeaning = highlightText(meaningText, term);
    let headerHTML = `<span class="limbu-word" lang="lif">${highlightedLimbu}</span>`;
    if (secondaryInfoText) {
        headerHTML += `<span class="secondary-info">${highlightedSecondary}</span>`;
        headerHTML += `<button class="tts-btn" data-text="${secondaryInfoText}" title="Listen"><i class="bx bx-volume-full"></i></button>`;
    }
    entryDiv.innerHTML = `
        <div class="entry-header">${headerHTML}</div>
        <div class="meaning-text">${highlightedMeaning}</div>
    `;
    container.appendChild(entryDiv);
    const limbuWordEl = entryDiv.querySelector('.limbu-word');
    if (limbuWordEl) {
        setTimeout(() => { limbuWordEl.style.letterSpacing = '0.01px'; }, 1);
    }
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
        loadingIndicator.textContent = currentIndex >= filteredEntries.length ? `End of list. Total entries: ${filteredEntries.length}` : '';
        return;
    }
    isLoading = true;
    const start = currentIndex;
    const end = Math.min(currentIndex + BATCH_SIZE, filteredEntries.length);
    loadingIndicator.style.display = 'block';
    loadingIndicator.innerHTML = '<i class="bx bx-loader bx-spin"></i> Loading more entries...';
    for (let i = start; i < end; i++) {
        renderEntry(filteredEntries[i], originalSearchTerm);
    }
    currentIndex = end;
    isLoading = false;
    loadingIndicator.textContent = currentIndex < filteredEntries.length ? `Scroll down to load more... (${currentIndex}/${filteredEntries.length})` : `End of list. Total entries: ${filteredEntries.length}`;
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
    originalSearchTerm = term.trim().normalize('NFC');
    currentSearchTerm = normalizeForSearch(originalSearchTerm);
    window.removeEventListener('scroll', handleScroll);
    if (!currentSearchTerm) {
        filteredEntries = allEntries;
    } else {
        filteredEntries = allEntries.filter(([key, entry]) => {
            const text = [entry.dId, entry.desc, entry.mean, entry.group].map(normalizeForSearch).join(' ');
            return text.includes(currentSearchTerm);
        });
        const searchTerm = originalSearchTerm;
        filteredEntries.sort((a, b) => {
            const entryA = a[1];
            const entryB = b[1];
            const dIdA = entryA.dId || '';
            const dIdB = entryB.dId || '';
            let scoreA = 10;
            if (dIdA === searchTerm) {
                scoreA = 1;
            } else if (dIdA.startsWith(searchTerm)) {
                scoreA = 2;
            } else {
                scoreA = 3;
            }
            let scoreB = 10;
            if (dIdB === searchTerm) {
                scoreB = 1;
            } else if (dIdB.startsWith(searchTerm)) {
                scoreB = 2;
            } else {
                scoreB = 3;
            }
            return scoreA - scoreB;
        });
    }
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

// --- Scroll to Top Functionality ---
const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
        scrollToTopBtn.classList.add('show');
    } else {
        scrollToTopBtn.classList.remove('show');
    }
});
scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// --- Extract Letters & Populate Index ---
function extractUniqueLetters() {
    const letters = allEntries.map(([k, e]) => fixStandaloneLimbu(e.dId || '')[0]).filter(ch => limbuAlphabet.includes(ch));
    return [...new Set(letters)].sort((a, b) => limbuAlphabet.indexOf(a) - limbuAlphabet.indexOf(b));
}

function populateLetterIndex(letters) {
    letterList.innerHTML = '';
    letters.forEach(letter => {
        const card = document.createElement('div');
        card.className = 'letter-group-card';
        card.textContent = letter;
        card.setAttribute('lang', 'lif');
        card.addEventListener('click', () => {
            history.pushState({ view: 'letter', letter }, '', `#letter-${letter}`);
            showMainView();
            currentLetter = letter;
            showLetterHeader(letter);
            filteredEntries = allEntries.filter(([k, e]) => fixStandaloneLimbu(e.dId || '')[0] === letter);
            originalSearchTerm = '';
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

// --- THIS IS THE CORRECTED SECTION ---
window.addEventListener('popstate', (event) => {
    // If there's no state, or we're going back to the initial "main" state
    if (!event.state || event.state.view === 'main') {
        showMainView();
        hideLetterHeader();
        currentLetter = null;

        // Reset the search and filter state completely
        searchInput.value = '';
        originalSearchTerm = '';
        currentSearchTerm = '';
        filteredEntries = allEntries;

        // Re-render the full list from the start
        container.innerHTML = '';
        currentIndex = 0;
        renderNextBatch();

        // Ensure the base URL is clean without a hash
        history.replaceState({ view: 'main' }, '', window.location.pathname);
    } else if (event.state.view === 'index') {
        showIndexView();
    } else if (event.state.view === 'letter') {
        showMainView();
        currentLetter = event.state.letter;
        showLetterHeader(currentLetter);

        // Filter and render for that specific letter
        filteredEntries = allEntries.filter(([k, e]) => fixStandaloneLimbu(e.dId || '')[0] === currentLetter);
        originalSearchTerm = '';
        currentSearchTerm = '';
        container.innerHTML = '';
        currentIndex = 0;
        renderNextBatch();
    }
});

// --- Initialize App ---
async function initApp() {
    // Establish a clean 'main' state at the very beginning.
    history.replaceState({ view: 'main' }, '', window.location.pathname);

    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        darkModeToggle.querySelector('i').classList.add('bx-sun');
        darkModeToggle.querySelector('i').classList.remove('bx-moon');
    }

    try {
        // --- Add hidden status element ---
        let statusEl = document.getElementById("data-status");
        if (!statusEl) {
            statusEl = document.createElement("div");
            statusEl.id = "data-status";
            statusEl.style.cssText = "display:none; font-size:12px; margin:8px 0; color:#888; text-align:center;";
            document.body.insertBefore(statusEl, document.body.firstChild);
        }

        // --- 1. Try fetching latest commit hash from GitHub API ---
        let dataUrl;
        try {
            const commitRes = await fetch("https://api.github.com/repos/ingsha09/limbu-dictionary-data/commits/main");
            if (!commitRes.ok) throw new Error(`GitHub API error: ${commitRes.status}`);
            const commitData = await commitRes.json();
            const commitHash = commitData.sha;

            // Build immutable URL using commit hash
            dataUrl = `https://cdn.jsdelivr.net/gh/ingsha09/limbu-dictionary-data@${commitHash}/data.json`;
            console.log("✅ Using commit hash:", commitHash);

            // Keep hidden since it's successful
            statusEl.style.display = "none";
        } catch (apiErr) {
            console.warn("⚠️ GitHub API failed, falling back to @main", apiErr);

            // Fallback: use @main with cache-busting timestamp
            dataUrl = `https://cdn.jsdelivr.net/gh/ingsha09/limbu-dictionary-data@main/data.json?t=${Date.now()}`;
            statusEl.textContent = "Dictionary loaded via fallback ⚠️ (@main + cache-bust)";
            statusEl.style.color = "orange";
            statusEl.style.display = "block";
        }

        // --- 2. Fetch dictionary data ---
        const res = await fetch(dataUrl);
        if (!res.ok) throw new Error(`Data fetch error: ${res.status}`);
        const data = await res.json();

        // --- 3. Normalize entries ---
        const normalizedData = Object.entries(data).map(([key, entry]) => {
            const normalizedEntry = {
                dId: entry.dId ? entry.dId.normalize('NFC') : '',
                desc: entry.desc ? entry.desc.normalize('NFC') : '',
                mean: entry.mean ? entry.mean.normalize('NFC') : '',
                group: entry.group ? entry.group.normalize('NFC') : ''
            };
            return [key, normalizedEntry];
        });
        allEntries = normalizedData.sort(limbuSort);
        filteredEntries = allEntries;
        initialLoading.style.display = 'none';

        // --- 4. Handle view from URL hash ---
        if (window.location.hash.startsWith('#letter-')) {
            const hashLetter = decodeURIComponent(window.location.hash.replace('#letter-', ''));
            history.replaceState({ view: 'letter', letter: hashLetter }, '', window.location.hash);
            showMainView();
            currentLetter = hashLetter;
            showLetterHeader(hashLetter);
            filteredEntries = allEntries.filter(([k, e]) => fixStandaloneLimbu(e.dId || '')[0] === hashLetter);
            container.innerHTML = '';
            currentIndex = 0;
            renderNextBatch();
        } else if (window.location.hash === '#index') {
            history.replaceState({ view: 'index' }, '', '#index');
            showIndexView();
        } else {
            showMainView();
            renderNextBatch();
        }
    } catch (err) {
        console.error("❌ Init error:", err);
        initialLoading.innerHTML = `<p class="error-message">Failed to load data: ${err.message}</p>`;
        loadingIndicator.style.display = 'none';

        const statusEl = document.getElementById("data-status");
        if (statusEl) {
            statusEl.textContent = `❌ Error: ${err.message}`;
            statusEl.style.color = "red";
            statusEl.style.display = "block";
        }
    }
}

initApp();
