/**
 * Kori AI Worker — powered by Transformers.js (loaded from CDN)
 * Handles: local LLM inference (SmolLM2) + Whisper speech recognition
 * No API key required. Models are downloaded from HuggingFace Hub on first use
 * and cached in the browser (chat ~200 MB, voice ~80 MB).
 */

import {
  pipeline,
  env
} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3/dist/transformers.min.js';

// Serve ONNX runtime WASM from CDN
env.backends.onnx.wasm.wasmPaths =
  'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';

let chatPipe    = null;
let whisperPipe = null;
let systemPrompt = '';

// ── Helpers ───────────────────────────────────────────────────────────────────
function resolve(id, payload) {
  self.postMessage({ type: 'RESOLVE', id, payload });
}
function reject(id, message) {
  self.postMessage({ type: 'REJECT', id, payload: message });
}

// ── Message router ────────────────────────────────────────────────────────────
self.addEventListener('message', async (e) => {
  const { type, id, payload } = e.data;

  try {
    switch (type) {

      // ── Store system prompt ────────────────────────────────────────────────
      case 'SET_PROMPT':
        systemPrompt = payload ?? '';
        resolve(id, 'ok');
        break;

      // ── Load chat LLM ──────────────────────────────────────────────────────
      case 'INIT_CHAT': {
        const model = payload?.model || 'HuggingFaceTB/SmolLM2-360M-Instruct';
        chatPipe = await pipeline('text-generation', model, {
          dtype: 'q4',
          progress_callback: (p) => self.postMessage({ type: 'PROGRESS', payload: p })
        });
        resolve(id, 'ready');
        break;
      }

      // ── Run LLM chat ───────────────────────────────────────────────────────
      case 'CHAT': {
        if (!chatPipe) { reject(id, 'Chat model not loaded'); break; }
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: payload.message }
        ];
        const out = await chatPipe(messages, {
          max_new_tokens: 110,
          temperature: 0.75,
          do_sample: true
        });
        // generated_text may be array-of-messages (chat template) or string
        const raw = out[0]?.generated_text;
        const reply = Array.isArray(raw)
          ? (raw.at(-1)?.content ?? '').trim()
          : String(raw ?? '').trim();
        resolve(id, reply || 'Hmm, no response 🐱');
        break;
      }

      // ── Load Whisper ASR ───────────────────────────────────────────────────
      case 'INIT_WHISPER': {
        whisperPipe = await pipeline(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny.en',
          {
            dtype: 'fp32',
            progress_callback: (p) => self.postMessage({ type: 'WHISPER_PROGRESS', payload: p })
          }
        );
        resolve(id, 'ready');
        break;
      }

      // ── Transcribe audio (16 kHz Float32Array) ─────────────────────────────
      case 'TRANSCRIBE': {
        if (!whisperPipe) { reject(id, 'Whisper not loaded'); break; }
        const result = await whisperPipe(payload.audio);
        resolve(id, (result.text ?? '').trim());
        break;
      }

      default:
        reject(id, `Unknown message type: ${type}`);
    }
  } catch (err) {
    reject(id, err?.message ?? 'Worker error');
  }
});
