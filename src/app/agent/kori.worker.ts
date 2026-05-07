/**
 * Kori AI Worker — @huggingface/transformers (bundled via npm)
 * Handles: local LLM inference (SmolLM2) + Whisper speech recognition.
 * ONNX runtime WASM is auto-fetched from jsDelivr CDN on first use.
 */
import { pipeline, TextStreamer } from '@huggingface/transformers';

const w = self as any;

let chatPipe:    any = null;
let whisperPipe: any = null;
let systemPrompt    = '';

function resolve(id: string, payload: any): void {
  console.log(`[KoriWorker] ✅ RESOLVE [${id}]`, payload);
  w.postMessage({ type: 'RESOLVE', id, payload });
}
function reject(id: string, message: string): void {
  console.error(`[KoriWorker] ❌ REJECT [${id}]`, message);
  w.postMessage({ type: 'REJECT', id, payload: message });
}

w.addEventListener('message', async (e: any) => {
  const { type, id, payload } = e.data as { type: string; id: string; payload: any };
  console.log(`[KoriWorker] 📨 Received [${type}] id=${id}`, payload ?? '');

  try {
    switch (type) {

      case 'SET_PROMPT':
        systemPrompt = payload ?? '';
        console.log('[KoriWorker] 📝 System prompt set, length=', systemPrompt.length);
        resolve(id, 'ok');
        break;

      case 'INIT_CHAT': {
        const model:  string = payload?.model  ?? 'onnx-community/gemma-3-270m-it';
        const device: string = payload?.device ?? 'cpu';
        const dtype:  string = payload?.dtype  ?? 'q4';
        console.log(`[KoriWorker] 🔄 Loading chat model: ${model} device=${device} dtype=${dtype}`);
        chatPipe = await (pipeline as any)('text-generation', model, {
          device: device as any,
          dtype:  dtype  as any,
          progress_callback: (p: any) => {
            console.log(`[KoriWorker] 📦 Chat download — status=${p?.status} file=${p?.file ?? ''} progress=${p?.progress != null ? Math.round(p.progress) + '%' : 'n/a'}`);
            w.postMessage({ type: 'PROGRESS', payload: p });
          }
        });
        console.log('[KoriWorker] ✅ Chat model ready');
        resolve(id, 'ready');
        break;
      }

      case 'CHAT': {
        if (!chatPipe) { reject(id, 'Model not loaded'); break; }
        const messages = [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: payload.message as string }
        ];
        console.log(`[KoriWorker] 💬 Generating reply for: "${payload.message}"`);

        let accumulated = '';
        const streamer = new TextStreamer(chatPipe.tokenizer, {
          skip_prompt:       true,
          skip_special_tokens: true,
          callback_function: (token: string) => {
            accumulated += token;
            w.postMessage({ type: 'TOKEN', id, payload: accumulated });
          }
        });

        const out: any = await chatPipe(messages, {
          max_new_tokens: 128,
          temperature:    0.7,
          do_sample:      true,
          repetition_penalty: 1.1,
          streamer
        });

        const raw   = out[0]?.generated_text;
        const reply = Array.isArray(raw)
          ? (raw.at(-1)?.content ?? '').trim()
          : accumulated.trim() || String(raw ?? '').trim();
        console.log(`[KoriWorker] 💬 Reply generated: "${reply}"`);
        resolve(id, reply || 'No response 🐱');
        break;
      }

      case 'INIT_WHISPER': {
        console.log('[KoriWorker] 🔄 Loading Whisper model: Xenova/whisper-tiny.en');
        whisperPipe = await (pipeline as any)(
          'automatic-speech-recognition',
          'Xenova/whisper-tiny.en',
          {
            dtype: 'fp32',
            progress_callback: (p: any) => {
              console.log(`[KoriWorker] 📦 Whisper download — status=${p?.status} file=${p?.file ?? ''} progress=${p?.progress != null ? Math.round(p.progress) + '%' : 'n/a'}`);
              w.postMessage({ type: 'WHISPER_PROGRESS', payload: p });
            }
          }
        );
        console.log('[KoriWorker] ✅ Whisper model ready');
        resolve(id, 'ready');
        break;
      }

      case 'TRANSCRIBE': {
        if (!whisperPipe) { reject(id, 'Whisper not loaded'); break; }
        console.log(`[KoriWorker] 🎤 Transcribing audio, samples=${(payload.audio as Float32Array).length}`);
        const result: any = await whisperPipe(payload.audio as Float32Array);
        console.log(`[KoriWorker] 🎤 Transcription: "${result.text}"`);
        resolve(id, (result.text ?? '').trim());
        break;
      }

      default:
        console.warn(`[KoriWorker] ⚠️ Unknown message type: ${type}`);
        reject(id, `Unknown message type: ${type}`);
    }
  } catch (err: any) {
    console.error(`[KoriWorker] 💥 Error in [${type}]:`, err);
    reject(id, err?.message ?? 'Worker error');
  }
});