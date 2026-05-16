// ─────────────────────────────────────────────────────────────────────────────
// environment.example.ts — committed template showing all available fields.
//
// DO NOT use this file directly.
// Copy .env.example → .env, fill in your values, then run:
//   node scripts/set-env.js
//
// This generates environment.ts (dev) and environment.prod.ts (prod).
// Both generated files are gitignored — only this example is committed.
// ─────────────────────────────────────────────────────────────────────────────

let environment = {
  production: false,

  // ── Firebase ──────────────────────────────────────────────────────────────
  firebaseConfig: {
    apiKey:            '',
    authDomain:        '',
    databaseURL:       '',
    projectId:         '',
    storageBucket:     '',
    messagingSenderId: '',
    appId:             '',
    measurementId:     ''
  },

  // ── AI provider keys (pre-loaded as defaults for Kori's settings panel) ───
  // Users can override any of these at runtime via the ⚙️ settings UI.
  openrouterKey: '',   // https://openrouter.ai/keys
  openaiKey:     '',   // https://platform.openai.com/api-keys
  claudeKey:     '',   // https://console.anthropic.com/

  // ── App ───────────────────────────────────────────────────────────────────
  baseUrl: '',
  author:  'Emmanuel1017'
};

environment.baseUrl = environment.production
  ? 'https://emmanuel1017.github.io/Angular-Resume'
  : 'http://localhost:4200';

export { environment };
