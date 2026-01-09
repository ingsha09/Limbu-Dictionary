# ᤁᤡᤖᤠᤳ ᤕᤠᤰᤌᤢᤱ ᤐᤠᤴᤈᤡᤰ (Limbu Dictionary v3)

A high-performance, mobile-first Progressive Web App (PWA) built to serve the **Limbu Dictionary API**. This interface provides instant access to over 8,000+ entries with support for the Sirijunga script.

---

## 🚀 Key Features

- **PWA Ready:** Installable on Android and iOS devices for an app-like experience.
- **Fast Search:** Optimized filtering across 8,000+ entries using a lightweight JavaScript engine.
- **Alphabetical Indexing:** Quick-navigation grid based on the official Sirijunga alphabet order.
- **Automated Data Engine:** Uses GitHub Actions to sanitize, sort, and re-index the dictionary data serially.
- **Modern UI:** Features a minimalist technical aesthetic with full Dark Mode support and high-contrast elements.
- **Offline Support:** Integrated Service Worker for reliable loading and asset caching.

---

## 🔌 API Information

The frontend consumes a structured JSON dataset hosted via GitHub's CDN. The data is processed through a CI/CD pipeline to ensure technical accuracy and consistency.

### **API Endpoint:**
```txt
https://raw.githubusercontent.com/ingsha09/limbu-dictionary-api/main/data.json
```

### **Data Structure (v3)**

Each entry in the API follows this standardized schema:
```json
{
  "id": "1",
  "limbu": "ᤀ",
  "phonetic": "a",
  "group": "vowel",
  "meaning": {
    "en": "The first vowel letter of the Sirijunga alphabet.",
    "ne": "सिरिजङ्गा वर्णमालाको पहिलो स्वरवर्ण ।"
  },
  "status": "verified"
}
```

---

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3 (Custom Variables), Vanilla JavaScript.
- **Icons:** Boxicons.
- **Backend/Storage:** JSON hosted on GitHub.
- **Automation:** GitHub Actions (Node.js runtime) for data re-indexing and sorting.
- **App Manifest:** Web App Manifest (PWA) & Service Workers.

---

## 📂 Project Structure

```plaintext
├── .github/workflows/
│   └── format-json.yml   # The Automation Engine (Sorting & Re-indexing)
├── index.html            # Core UI Structure & PWA Metadata
├── style.css             # V3 Design System & Dark Mode Logic
├── script.js             # API Fetching, Search & PWA Service Worker Registration
├── sw.js                 # Offline Caching Logic
├── manifest.json         # PWA Installation Config
├── data.json             # The Dictionary Database
└── icon-512.png          # App Icon (LA v3 Branding)
```

---

## ⚙️ How the Automation Works

This project features a Self-Cleaning Database. Whenever the `data.json` is updated:

- **Sanitization:** Leading hyphens are removed from Limbu words and HTML tags are stripped.
- **Phonetic Cleanup:** All brackets and slashes are removed from the phonetic field for a clean UI.
- **Sirijunga Sorting:** Entries are sorted according to the traditional Limbu alphabetical order.
- **Serial Re-indexing:** IDs are reassigned from 1 to N so the database remains perfectly sequential.

---

## 🤝 Contributing & Feedback

Suggestions for new words or corrections can be submitted directly through the interface:

- Click the [+] button to suggest a new entry.
- Click **Suggest Edit** on any existing card.

Submissions are tracked as [GitHub Issues](https://github.com/ingsha09/limbu-dictionary-api/issues) on the Limbu Dictionary API Repository.

Maintained by **@ingsha09**.