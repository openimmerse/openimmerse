# OpenImmerse

[中文文档](./README.md) | English

AI-native Immersive Translation Chrome Extension - Supporting OpenAI-compatible APIs

## ✨ Features

- 🚀 **AI-Focused Translation** - Supports OpenAI, DeepSeek, Azure, Ollama and other OpenAI-compatible APIs
- 📖 **Lazy Loading** - Only translates visible content, saving tokens and avoiding 429 errors
- 💾 **Smart Caching** - IndexedDB local cache to avoid duplicate translations
- 🎯 **Text Selection Translation** - Quick translation by selecting text
- ⚡ **Streaming Output** - Real-time translation display with typewriter effect
- 🎨 **Shadow DOM** - Style isolation without affecting the original webpage

## Screenshots

![Settings Panel](./image/openimmerse.png)
![Translation Demo](./image/openimmerse-translate-website.png)

## 🛠️ Tech Stack

- **Core:** React + TypeScript + Vite
- **Extension:** Manifest V3
- **State:** Zustand
- **UI:** Shadow DOM + Tailwind CSS
- **Storage:** chrome.storage.local + IndexedDB

## 📦 Installation

### Development Mode

```bash
# Install dependencies
npm install

# Development build (watch mode)
npm run dev

# Production build
npm run build
```

### Load Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` directory

## ⚙️ Configuration

1. Click the extension icon to open the settings panel
2. Select AI provider (OpenAI / DeepSeek / Azure / Ollama / Custom)
3. Enter API Base URL and API Key
4. Choose model name
5. Click "Test Connection" to verify

### Supported Providers

| Provider | Base URL | Example Model |
|----------|----------|---------------|
| OpenAI | https://api.openai.com/v1 | gpt-4o-mini |
| DeepSeek | https://api.deepseek.com/v1 | deepseek-chat |
| Azure | https://YOUR_RESOURCE.openai.azure.com | gpt-4 |
| Ollama | http://localhost:11434/v1 | llama2 |

## 🎮 Usage

### Full Page Translation

1. Enable "Page Translation" toggle in the settings panel
2. The extension will automatically detect and translate visible text
3. New content entering the viewport will be translated automatically as you scroll

### Text Selection Translation

1. Select text on any webpage
2. Click the translation icon that appears
3. View the translation result in the popup

## 🔧 Advanced Settings

### Custom Prompt

You can customize the translation prompt in the "Advanced" tab, for example:

```
You are a technical expert. Please translate the following text into Chinese and explain any technical terms.
```

### Concurrency Control

Adjust the concurrency limit to avoid API rate limiting (429 errors). Default value is 3.

## 📁 Project Structure

```
src/
├── background/     # Service Worker
├── content/        # Content Script
├── core/           # Core Logic
│   ├── domParser.ts    # DOM Parser
│   ├── translator.ts   # Translation Engine
│   └── tooltip.ts      # Text Selection Translation
├── popup/          # Settings UI
├── types/          # TypeScript Types
└── utils/          # Utility Functions
    ├── api.ts      # API Calls
    ├── cache.ts    # IndexedDB Cache
    └── storage.ts  # Chrome Storage
```

## Tips

After building:

* Refresh the extension on Chrome extensions page
* Refresh the webpage you want to translate (important: content script only injects on page load)
* Then click the extension icon to enable translation
* If issues persist, open DevTools Console on the target page and check for `[OpenImmerse] Initializing...` log to confirm content script is loaded

## 📄 License

MIT License

## 🤝 Contributing

Issues and Pull Requests are welcome!
