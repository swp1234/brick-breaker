/**
 * i18n - Multi-language Support Module
 * Supports: Korean, English, Chinese, Hindi, Russian, Japanese, Spanish, Portuguese, Indonesian, Turkish, German, French
 */

class I18n {
    constructor() {
        this.translations = {};
        this.supportedLanguages = ['ko', 'en', 'zh', 'hi', 'ru', 'ja', 'es', 'pt', 'id', 'tr', 'de', 'fr'];
        this.currentLang = this.detectLanguage();
        this.init();
    }

    detectLanguage() {
        // Check localStorage
        const saved = localStorage.getItem('i18n_lang');
        if (saved && this.supportedLanguages.includes(saved)) {
            return saved;
        }

        // Check browser language
        const browserLang = (navigator.language || navigator.userLanguage).split('-')[0];
        if (this.supportedLanguages.includes(browserLang)) {
            return browserLang;
        }

        // Default to English
        return 'en';
    }

    async loadTranslations(lang) {
        if (this.translations[lang]) {
            return this.translations[lang];
        }

        try {
            const response = await fetch(`js/locales/${lang}.json`);
            if (!response.ok) throw new Error(`Failed to load ${lang}`);
            this.translations[lang] = await response.json();
            return this.translations[lang];
        } catch (error) {
            console.error(`Error loading language ${lang}:`, error);
            if (lang !== 'en') {
                return this.loadTranslations('en');
            }
            return {};
        }
    }

    t(key) {
        const keys = key.split('.');
        let value = this.translations[this.currentLang] || {};

        for (const k of keys) {
            if (typeof value === 'object' && value !== null) {
                value = value[k];
            } else {
                return key; // Return key if not found
            }
        }

        return typeof value === 'string' ? value : key;
    }

    async setLanguage(lang) {
        if (!this.supportedLanguages.includes(lang)) {
            console.warn(`Unsupported language: ${lang}`);
            return;
        }

        await this.loadTranslations(lang);
        this.currentLang = lang;
        localStorage.setItem('i18n_lang', lang);
        this.updateUI();
    }

    updateUI() {
        // Update data-i18n attributes
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            el.textContent = this.t(key);
        });

        // Update data-i18n-attr attributes (for buttons/aria-labels)
        document.querySelectorAll('[data-i18n-attr]').forEach(el => {
            const attr = el.getAttribute('data-i18n-attr');
            const key = el.getAttribute(`data-i18n-${attr}`);
            if (key) {
                el.setAttribute(attr, this.t(key));
            }
        });

        // Update lang menu active state
        document.querySelectorAll('.lang-option').forEach(btn => {
            const lang = btn.getAttribute('data-lang');
            if (lang === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    getCurrentLanguage() {
        return this.currentLang;
    }

    getLanguageName(lang) {
        const names = {
            'ko': '🇰🇷 한국어',
            'en': '🇺🇸 English',
            'zh': '🇨🇳 中文',
            'hi': '🇮🇳 हिन्दी',
            'ru': '🇷🇺 Русский',
            'ja': '🇯🇵 日本語',
            'es': '🇪🇸 Español',
            'pt': '🇧🇷 Português',
            'id': '🇮🇩 Bahasa Indonesia',
            'tr': '🇹🇷 Türkçe',
            'de': '🇩🇪 Deutsch',
            'fr': '🇫🇷 Français'
        };
        return names[lang] || lang;
    }

    async init() {
        await this.loadTranslations(this.currentLang);
        this.setupLanguageMenu();
        this.updateUI();
    }

    setupLanguageMenu() {
        const langMenu = document.getElementById('langMenu');
        const langBtn = document.getElementById('langBtn');

        if (!langMenu) return;

        // Clear existing options
        langMenu.innerHTML = '';

        // Add language options
        this.supportedLanguages.forEach(lang => {
            const btn = document.createElement('button');
            btn.className = 'lang-option';
            btn.setAttribute('data-lang', lang);
            btn.textContent = this.getLanguageName(lang);

            if (lang === this.currentLang) {
                btn.classList.add('active');
            }

            btn.addEventListener('click', () => {
                this.setLanguage(lang);
                langMenu.classList.add('hidden');
            });

            langMenu.appendChild(btn);
        });

        // Toggle menu
        if (langBtn) {
            langBtn.addEventListener('click', () => {
                langMenu.classList.toggle('hidden');
            });

            // Close menu on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.language-selector')) {
                    langMenu.classList.add('hidden');
                }
            });
        }
    }
}

// Global instance
window.i18n = new I18n();
