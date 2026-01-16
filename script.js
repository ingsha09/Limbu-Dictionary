const API_URL = 'https://raw.githubusercontent.com/ingsha09/limbu-dictionary-api/main/data.json';
const REPO = 'https://github.com/ingsha09/limbu-dictionary-api';
const limbuAlphabet = ['ᤀ', 'ᤁ', 'ᤂ', 'ᤃ', 'ᤄ', 'ᤅ', 'ᤆ', 'ᤇ', 'ᤈ', 'ᤋ', 'ᤌ', 'ᤍ', 'ᤎ', 'ᤏ', 'ᤐ', 'ᤑ', 'ᤒ', 'ᤓ', 'ᤔ', 'ᤕ', 'ᤖ', 'ᤗ', 'ᤘ', 'ᤙ', 'ᤛ', 'ᤜ'];

let allWords = [], filteredWords = [], cursor = 0;
let currentReportId = '';

/**
 * INITIALIZE ENGINE
 */
async function init() {
    try {
        const res = await fetch(API_URL);
        const data = await res.json();
        
        // Data sanitization (Trusting GitHub Action for sorting/IDs)
        allWords = data.map(w => ({ 
            ...w, 
            limbu: w.limbu.startsWith('-') ? w.limbu.substring(1) : w.limbu 
        }));
        
        filteredWords = [...allWords];

        // Update UI Stats
        const counterEl = document.getElementById('total-count');
        if (counterEl) counterEl.innerText = allWords.length.toLocaleString();

        // Smoothly hide loading screen
        const loader = document.getElementById('initial-loading');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 400);
        }

        setupAlphabetGrid();
        render(true);
    } catch (e) { 
        console.error("Sync Failure:", e); 
        const loader = document.getElementById('initial-loading');
        if (loader) loader.innerHTML = "<p style='color:#ff7675'>DATABASE CONNECTION ERROR</p>";
    }
}

/**
 * RENDER ENTRIES (Infinite Scroll Style)
 */
function render(reset = false) {
    const container = document.getElementById('dictionary-container');
    if (reset) { container.innerHTML = ''; cursor = 0; }
    
    // Slice next 25 items for performance
    filteredWords.slice(cursor, cursor + 25).forEach(w => {
        const item = document.createElement('div');
        item.className = 'dictionary-entry';
        const status = w.status?.toLowerCase() || 'pending';
        
        // Clean phonetic display (prevents double brackets/slashes)
        let phoneticHTML = '';
        if (w.phonetic && w.phonetic.trim() !== "") {
            const cleanPhonetic = w.phonetic.replace(/[\/\[\]]/g, '');
            phoneticHTML = `<div class="phonetic">[${cleanPhonetic}]</div>`;
        }
        
        item.innerHTML = `
            <div class="status-tag ${status}">${status}</div>
            <div class="limbu-row">
                <span class="limbu-word">${w.limbu}</span>
                <i class="bx bx-copy copy-icon" onclick="copyText('${w.limbu}')" title="Copy Word"></i>
            </div>
            ${phoneticHTML}
            <div class="meaning-en">${w.meaning.en}</div>
            <div class="meaning-ne">${w.meaning.ne}</div>
            <div class="entry-footer">
                <button class="action-btn" onclick="openReportModal('edit', '${w.id}', '${w.limbu}')">Suggest Edit</button>
                <button class="action-btn report-style" onclick="openReportModal('report', '${w.id}', '${w.limbu}')">Report (#${w.id})</button>
            </div>
        `;
        container.appendChild(item);
    });
    cursor += 25;
}

/**
 * UTILITIES
 */
function copyText(text) {
    navigator.clipboard.writeText(text);
    const toast = document.getElementById('toast');
    toast.style.visibility = 'visible';
    setTimeout(() => toast.style.visibility = 'hidden', 2000);
}

function toggleModal(id) {
    const m = document.getElementById(id);
    m.style.display = (m.style.display === 'flex') ? 'none' : 'flex';
}

function toggleAlphabet() {
    const m = document.getElementById('alphabet-modal');
    const icon = document.querySelector('#menu-toggle-btn i');
    const isOpen = (m.style.display === 'flex');
    m.style.display = isOpen ? 'none' : 'flex';
    if (icon) icon.className = isOpen ? 'bx bx-menu-alt-right' : 'bx bx-x';
}

function setupAlphabetGrid() {
    const grid = document.getElementById('alphabet-grid');
    if (grid) {
        grid.innerHTML = limbuAlphabet.map(l => 
            `<button class="alpha-btn" onclick="applyFilter('${l}')">${l}</button>`).join('');
    }
}

function applyFilter(char) {
    filteredWords = allWords.filter(w => w.limbu.startsWith(char));
    document.getElementById('active-char').innerText = char;
    document.getElementById('filter-banner').style.display = 'flex';
    toggleAlphabet();
    window.scrollTo(0,0);
    render(true);
}

function resetAll() {
    filteredWords = [...allWords];
    document.getElementById('filter-banner').style.display = 'none';
    document.getElementById('search-input').value = '';
    window.scrollTo(0,0);
    render(true);
}

/**
 * MODAL ACTIONS
 */
function openReportModal(type, id = '', word = '') {
    const modal = document.getElementById('report-modal');
    const context = document.getElementById('report-context-value');
    currentReportId = id;
    modal.style.display = 'flex';
    document.getElementById('report-title').innerText = type.toUpperCase();
    context.innerText = word ? `${word} (#${id})` : 'System Update Request';
}

function closeReportModal() { 
    document.getElementById('report-modal').style.display = 'none';
    document.getElementById('report-text').value = '';
}

function submitToGithub() {
    const details = document.getElementById('report-text').value;
    if (!details) return;
    const type = document.getElementById('report-title').innerText;
    const context = document.getElementById('report-context-value').innerText;
    window.open(`${REPO}/issues/new?title=[${type}] ${context}&body=${details}`, '_blank');
    closeReportModal();
}

/**
 * EVENT LISTENERS
 */
document.getElementById('search-input').oninput = (e) => {
    const val = e.target.value.toLowerCase();
    filteredWords = allWords.filter(w => 
        w.limbu.includes(val) || 
        w.meaning.en.toLowerCase().includes(val) ||
        w.meaning.ne.includes(val)
    );
    render(true);
};

document.getElementById('theme-toggle').onclick = () => {
    document.body.classList.toggle('dark-mode');
    const i = document.querySelector('#theme-toggle i');
    if (i) i.className = document.body.classList.contains('dark-mode') ? 'bx bx-sun' : 'bx bx-moon';
};

window.onscroll = () => {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 800) {
        if (cursor < filteredWords.length) render();
    }
};

/**
 * PWA SERVICE WORKER REGISTRATION
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW Registered'))
            .catch(err => console.log('SW Failed', err));
    });
}

// Fire Init
init();
