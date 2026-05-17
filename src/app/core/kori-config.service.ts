// ─────────────────────────────────────────────────────────────────────────────
// KoriConfigService — Angular twin of the Flutter KoriConfigService.
//
// Subscribes to /portfolio/kori in Firestore. The Flutter admin app writes
// to this doc; the Angular Kori reads from it and rebuilds her system prompt
// at every message-send time, so any edit on the admin reflects on the next
// reply with no redeploy.
//
// Both apps share the same schema and the same `composePrompt()` semantics
// (see Flutter's KoriConfig.composePrompt for the canonical implementation).
// Kept tidy and small here because Angular's prompt builder lives in
// AgentService.buildLiveSystemPrompt() and just calls composePrompt() on the
// latest snapshot.
// ─────────────────────────────────────────────────────────────────────────────

import { Injectable, OnDestroy } from '@angular/core';
import {
  Firestore, doc, docData, setDoc, DocumentReference,
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

export type KoriTone      = 'professional' | 'friendly' | 'playful' | 'confident';
export type KoriBrevity   = 'concise' | 'medium' | 'detailed';
export type KoriEmojiFreq = 'off' | 'rare' | 'sometimes' | 'often';

export interface KoriSection { title: string; body: string; }

export interface KoriConfig {
  enabled:        boolean;
  greeting:       string;
  persona:        string;
  coreBelief:     string;
  knowledge:      string;
  employment:     string;
  capabilities:   string;
  behaviour:      string;
  extraSections:  KoriSection[];
  tone:           KoriTone;
  brevity:        KoriBrevity;
  emojiFreq:      KoriEmojiFreq;
  hype:           number;
  temperature:    number;
  maxTokens:      number;
  webSearch:      boolean;
  imageGen:       boolean;
  markdown:       boolean;
  modelOverride:  string;
}

const DEFAULT: KoriConfig = {
  enabled:        true,
  greeting:       '',
  persona:        '',
  coreBelief:     '',
  knowledge:      '',
  employment:     '',
  capabilities:   '',
  behaviour:      '',
  extraSections:  [],
  tone:           'confident',
  brevity:        'concise',
  emojiFreq:      'rare',
  hype:           0.7,
  temperature:    0.75,
  maxTokens:      350,
  webSearch:      true,
  imageGen:       true,
  markdown:       true,
  modelOverride:  '',
};

@Injectable({ providedIn: 'root' })
export class KoriConfigService implements OnDestroy {

  readonly config$ = new BehaviorSubject<KoriConfig>(DEFAULT);
  private sub?: Subscription;
  private ref: DocumentReference;

  constructor(private firestore: Firestore) {
    this.ref = doc(this.firestore, 'portfolio', 'kori');
    this.sub = (docData(this.ref) as Observable<any>).subscribe({
      next: d => {
        if (!d) { this.config$.next(DEFAULT); return; }
        this.config$.next({
          enabled:        d['enabled']      ?? true,
          greeting:       d['greeting']     ?? '',
          persona:        d['persona']      ?? '',
          coreBelief:     d['core_belief']  ?? '',
          knowledge:      d['knowledge']    ?? '',
          employment:     d['employment']   ?? '',
          capabilities:   d['capabilities'] ?? '',
          behaviour:      d['behaviour']    ?? '',
          extraSections:  Array.isArray(d['extra_sections'])
                            ? d['extra_sections'].map((s: any) => ({
                                title: s?.title ?? '',
                                body:  s?.body  ?? '',
                              }))
                            : [],
          tone:           (d['tone']        ?? 'confident') as KoriTone,
          brevity:        (d['brevity']     ?? 'concise')   as KoriBrevity,
          emojiFreq:      (d['emoji_freq']  ?? 'rare')      as KoriEmojiFreq,
          hype:           clamp(d['hype']        ?? 0.7,  0, 1),
          temperature:    clamp(d['temperature'] ?? 0.75, 0, 2),
          maxTokens:      clamp(d['max_tokens']  ?? 350,  50, 4096),
          webSearch:      d['web_search'] ?? true,
          imageGen:       d['image_gen']  ?? true,
          markdown:       d['markdown']   ?? true,
          modelOverride:  d['model_override'] ?? '',
        });
      },
      error: () => { /* offline / no doc — keep defaults */ },
    });
  }

  /** Compose the prompt the same way the Flutter side does. Mirrors
   *  KoriConfig.composePrompt in lib/services/kori_config_service.dart. */
  composePrompt(c: KoriConfig = this.config$.value): string {
    const hypeLine =
      c.hype >= 0.85 ? 'Speak about Emmanuel with maximum hype — superlatives where they fit, but stay credible.' :
      c.hype >= 0.55 ? 'Speak about Emmanuel with confident, warm advocacy.' :
                       'Speak about Emmanuel professionally and concisely.';

    const toneLine =
      c.tone === 'professional' ? 'Tone: professional, like a senior tech recruiter.' :
      c.tone === 'friendly'     ? 'Tone: friendly, like a colleague who knows him well.' :
      c.tone === 'playful'      ? 'Tone: playful, a little cheeky — but never silly.' :
                                  'Tone: confident and direct.';

    const brevityLine =
      c.brevity === 'detailed' ? 'Length: a short paragraph when the question warrants it. End with a clear takeaway.' :
      c.brevity === 'medium'   ? 'Length: 1–3 sentences. Short bullet list when listing 3+ items.' :
                                 'Length: 1 short sentence per reply when possible, max 2.';

    const emojiLine =
      c.emojiFreq === 'off'       ? 'Emoji: never.' :
      c.emojiFreq === 'sometimes' ? 'Emoji: one per reply if it adds warmth. 🐾 😺 ✨.' :
      c.emojiFreq === 'often'     ? 'Emoji: liberal — 1–2 per reply. Stay tasteful.' :
                                    'Emoji: at most one every 3 replies. 🐾 or 😺 only.';

    const caps: string[] = [];
    if (c.webSearch) caps.push('- Web search: live grounding is enabled. When a question needs an external reference, search and cite inline as a markdown link.');
    if (c.imageGen)  caps.push('- Image generation: if the visitor asks you to draw / sketch / render / paint, end the reply with `image: <one-line description>`.');
    if (c.markdown)  caps.push('- Markdown: use light markdown — **bold** for names and tech, [text](https://...) for links, occasional bullets.');

    const extras = c.extraSections
      .filter(s => (s.title || s.body).trim().length > 0)
      .map(s => `${s.title.toUpperCase()}\n${s.body}`)
      .join('\n\n');

    return [
      c.persona,
      '',
      'CORE BELIEF (non-negotiable)',
      c.coreBelief,
      '',
      'WHO HE IS / WHAT HE DOES',
      c.knowledge,
      '',
      'WHERE HE\'S WORKED',
      c.employment,
      ...(caps.length ? ['', 'CAPABILITIES', ...caps] : []),
      '',
      'BEHAVIOUR',
      c.behaviour,
      hypeLine,
      toneLine,
      brevityLine,
      emojiLine,
      ...(extras ? ['', extras] : []),
    ].join('\n');
  }

  async save(cfg: KoriConfig): Promise<void> {
    await setDoc(this.ref, {
      enabled:        cfg.enabled,
      greeting:       cfg.greeting,
      persona:        cfg.persona,
      core_belief:    cfg.coreBelief,
      knowledge:      cfg.knowledge,
      employment:     cfg.employment,
      capabilities:   cfg.capabilities,
      behaviour:      cfg.behaviour,
      extra_sections: cfg.extraSections,
      tone:           cfg.tone,
      brevity:        cfg.brevity,
      emoji_freq:     cfg.emojiFreq,
      hype:           cfg.hype,
      temperature:    cfg.temperature,
      max_tokens:     cfg.maxTokens,
      web_search:     cfg.webSearch,
      image_gen:      cfg.imageGen,
      markdown:       cfg.markdown,
      model_override: cfg.modelOverride,
    }, { merge: true });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number(n)));
}
