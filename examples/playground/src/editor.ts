import { Composer, Config, type Update } from '../wasm/druti_wasm.js';

/** A composer update copied out of WASM memory. */
type Edit = Pick<Update, 'replaceBefore' | 'commit' | 'pending' | 'handled'>;

/**
 * Keys that only modify the next key. Pressing one alone must not end the
 * cluster: Shift before `T` in `ekoTa` would otherwise reset the composer,
 * and the reset would resume `ক` from the document (`এক্টা`, not `একটা`).
 */
const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'AltGraph',
  'Meta',
  'CapsLock',
  'Fn',
  'FnLock',
  'Hyper',
  'Super',
  'Symbol',
  'SymbolLock',
]);

const toEdit = (update: Update): Edit => {
  const { replaceBefore, commit, pending, handled } = update;
  update.free();
  return { replaceBefore, commit, pending, handled };
};

/**
 * A plain-text editor that types through Druti's composer, the same way the
 * macOS input method does: committed text is final, and the composer's pending
 * text is shown inline and underlined (macOS "marked text").
 *
 * The editor keeps its own model (`text`, `caret`, `pending`) while the user
 * types through the composer, and renders it as at most three DOM nodes. When
 * anything else touches the document (a click, arrow keys, paste, English
 * mode, the browser's own Backspace), the pending text is committed where it
 * is and the model is marked stale; the next composer key re-reads the DOM
 * and resets the composer with the real text before the caret.
 */
export class DrutiEditor {
  /** Committed document text, without the pending text. */
  private text = '';
  /** UTF-16 offset in `text` where the pending text sits. */
  private caret = 0;
  private pending = '';
  private pendingSpan: HTMLSpanElement | null = null;
  /** The DOM changed outside the model; re-read it before the next key. */
  private stale = true;
  private composer: Composer;
  private english = false;

  constructor(
    private readonly root: HTMLElement,
    private config: Config,
  ) {
    this.composer = new Composer(config);
    root.contentEditable = 'plaintext-only';
    if (root.contentEditable !== 'plaintext-only') {
      root.contentEditable = 'true';
    }
    root.spellcheck = false;

    root.addEventListener('keydown', (e) => this.onKeyDown(e));
    const commitAndForget = () => {
      this.commitPending();
      this.stale = true;
    };
    root.addEventListener('pointerdown', commitAndForget);
    root.addEventListener('blur', commitAndForget);
    // `beforeinput` only fires for edits the browser makes itself (composer
    // keys are prevented at keydown): paste, mobile keyboards, dictation.
    for (const type of ['paste', 'cut', 'drop', 'beforeinput'] as const) {
      root.addEventListener(type, commitAndForget);
    }
    // Any edit the browser makes itself (English mode, Backspace with nothing
    // pending, paste, a mobile keyboard) leaves the model behind.
    root.addEventListener('input', () => {
      this.stale = true;
      root.classList.toggle('is-empty', root.textContent === '');
    });
    root.classList.add('is-empty');
  }

  get isEnglishMode(): boolean {
    return this.english;
  }

  /** English mode: keys go into the editor unchanged. */
  setEnglishMode(on: boolean): void {
    if (on === this.english) return;
    if (on) {
      this.commitPending();
    } else {
      this.guard(() => this.composer.reset().free());
    }
    this.english = on;
    this.stale = true;
  }

  /** Applies from the next key. */
  setConfig(config: Config): void {
    this.config = config;
    this.guard(() => this.composer.setConfig(config));
  }

  focus(): void {
    this.root.focus();
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.isComposing || this.english || MODIFIER_KEYS.has(e.key)) return;

    const plain = !e.ctrlKey && !e.metaKey && !e.altKey;
    const typed = plain && e.key.length === 1;
    const composerKey = typed || (plain && (e.key === 'Backspace' || e.key === 'Enter'));
    if (!composerKey) {
      // Arrows, Tab, Escape, shortcuts, and keys a mobile keyboard can't name:
      // commit as it is and let the browser act.
      this.commitPending();
      this.stale = true;
      return;
    }

    if (this.stale && !this.resyncFromDom(e.key === 'Backspace')) {
      // Backspace over a selection: the selection was deleted, nothing else to do.
      e.preventDefault();
      return;
    }

    const update = this.guard(() =>
      toEdit(
        e.key === 'Backspace'
          ? this.composer.backspace(this.text.slice(0, this.caret))
          : this.composer.key(e.key, this.text.slice(0, this.caret)),
      ),
    );
    if (!update) {
      // The engine failed; the browser types the key instead.
      this.commitPending();
      this.stale = true;
      return;
    }

    this.apply(update);
    if (e.key === 'Enter') {
      // The composer flushed and leaves the newline to the host.
      this.text = this.text.slice(0, this.caret) + '\n' + this.text.slice(this.caret);
      this.caret += 1;
      this.render();
      e.preventDefault();
      return;
    }
    this.render();
    if (update.handled) {
      e.preventDefault();
    } else {
      // Backspace after text that isn't Bengali: the browser deletes.
      this.stale = true;
    }
  }

  /** Applies an update: delete, replace the pending text with the commit, show the new pending. */
  private apply(update: Edit): void {
    const start = Math.max(0, this.caret - update.replaceBefore);
    this.text = this.text.slice(0, start) + update.commit + this.text.slice(this.caret);
    this.caret = start + update.commit.length;
    this.pending = update.pending;
  }

  /**
   * Commits the pending text where it is without touching the DOM selection:
   * the underline is removed and the text becomes ordinary document text.
   */
  private commitPending(): void {
    if (!this.pending) return;
    const update = this.guard(() => toEdit(this.composer.flush()));
    if (update) {
      this.apply(update);
    } else {
      this.text = this.text.slice(0, this.caret) + this.pending + this.text.slice(this.caret);
      this.caret += this.pending.length;
      this.pending = '';
    }
    this.pendingSpan?.classList.remove('pending');
    this.pendingSpan = null;
  }

  /**
   * Re-reads the document and caret from the DOM and resets the composer with
   * the real text before the caret. A selection is deleted first, as typing
   * over it would. Returns false when that deletion was the whole Backspace.
   */
  private resyncFromDom(backspace: boolean): boolean {
    const { text, start, end } = readDom(this.root);
    this.text = text.slice(0, start) + text.slice(end);
    this.caret = start;
    this.pending = '';
    this.stale = false;
    this.guard(() => this.composer.reset(this.text.slice(0, this.caret)).free());
    if (start !== end) {
      this.render();
      return !backspace;
    }
    return true;
  }

  private render(): void {
    const before = document.createTextNode(this.text.slice(0, this.caret));
    const after = document.createTextNode(this.text.slice(this.caret));
    const nodes: Node[] = [before];
    this.pendingSpan = null;
    if (this.pending) {
      this.pendingSpan = document.createElement('span');
      this.pendingSpan.className = 'pending';
      this.pendingSpan.textContent = this.pending;
      nodes.push(this.pendingSpan);
    }
    nodes.push(after);
    // A trailing newline only shows as an empty last line when something follows it.
    if ((this.text + this.pending).endsWith('\n')) {
      const br = document.createElement('br');
      br.dataset.placeholder = '';
      nodes.push(br);
    }
    this.root.replaceChildren(...nodes);
    this.root.classList.toggle('is-empty', this.text === '' && this.pending === '');

    const selection = document.getSelection();
    if (selection && document.activeElement === this.root) {
      selection.collapse(after, 0);
    }
  }

  /** Runs a composer call; if the engine traps, starts over with a new composer. */
  private guard<T>(call: () => T): T | null {
    try {
      return call();
    } catch (error) {
      console.error('Druti engine error; starting a new composer', error);
      try {
        this.composer.free();
      } catch {
        // The old instance may already be unusable.
      }
      this.composer = new Composer(this.config);
      this.pending = '';
      this.stale = true;
      return null;
    }
  }
}

/**
 * The editor's plain text and the selection as UTF-16 offsets. Line breaks the
 * browser may have inserted as `<br>` or block elements count as `\n`; the
 * placeholder `<br>` that `render` adds does not.
 */
function readDom(root: HTMLElement): { text: string; start: number; end: number } {
  const selection = document.getSelection();
  const range =
    selection && selection.rangeCount > 0 && root.contains(selection.getRangeAt(0).startContainer)
      ? selection.getRangeAt(0)
      : null;
  let text = '';
  let start = -1;
  let end = -1;

  const mark = (container: Node, offset: number) => {
    if (!range) return;
    if (range.startContainer === container && range.startOffset === offset) start = text.length;
    if (range.endContainer === container && range.endOffset === offset) end = text.length;
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const data = (node as Text).data;
      if (range?.startContainer === node) start = text.length + range.startOffset;
      if (range?.endContainer === node) end = text.length + range.endOffset;
      text += data;
      return;
    }
    if (!(node instanceof HTMLElement)) return;
    if (node.tagName === 'BR') {
      if (!('placeholder' in node.dataset)) text += '\n';
      return;
    }
    const block = node !== root && (node.tagName === 'DIV' || node.tagName === 'P');
    if (block && text !== '' && !text.endsWith('\n')) text += '\n';
    node.childNodes.forEach((child, index) => {
      mark(node, index);
      walk(child);
    });
    mark(node, node.childNodes.length);
  };

  walk(root);
  if (start < 0) start = text.length;
  if (end < 0) end = start;
  return { text, start: Math.min(start, end), end: Math.max(start, end) };
}
