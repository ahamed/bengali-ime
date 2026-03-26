import { BengaliIME, transpileRomanDocument, type IMEAction } from '@ahamed/bengali-ime';

const applyImeActionsAtCaret = (
  value: string,
  caret: number,
  actions: IMEAction[],
): { value: string; caret: number } => {
  let nextValue = value;
  let nextCaret = caret;
  for (const action of actions) {
    if (action.type === 'insert') {
      nextValue = nextValue.slice(0, nextCaret) + action.text + nextValue.slice(nextCaret);
      nextCaret += action.text.length;
      continue;
    }
    if (action.type === 'replace') {
      const start = nextCaret - action.charsBack;
      nextValue = nextValue.slice(0, start) + action.text + nextValue.slice(nextCaret);
      nextCaret = start + action.text.length;
      continue;
    }
    if (action.type === 'delete') {
      const start = nextCaret - action.charsBack;
      nextValue = nextValue.slice(0, start) + nextValue.slice(nextCaret);
      nextCaret = start;
      continue;
    }
    if (action.type === 'splitBlock') {
      nextValue = nextValue.slice(0, nextCaret) + '\n' + nextValue.slice(nextCaret);
      nextCaret += 1;
    }
  }
  return { value: nextValue, caret: nextCaret };
};

const resyncImeIfPrefixDrifted = (ime: BengaliIME, value: string, caret: number) => {
  const prefix = value.slice(0, caret);
  if (prefix === ime.output) {
    return;
  }
  ime.output = prefix;
  ime.buffer = '';
};

const streamInput = document.querySelector<HTMLTextAreaElement>('#stream-input');
const toggleEnglish = document.querySelector<HTMLButtonElement>('#toggle-english');
const modeLabel = document.querySelector<HTMLSpanElement>('#mode-label');
const romanInput = document.querySelector<HTMLTextAreaElement>('#roman-input');
const bengaliOutput = document.querySelector<HTMLTextAreaElement>('#bengali-output');
const transpileRun = document.querySelector<HTMLButtonElement>('#transpile-run');
const preserveBreaks = document.querySelector<HTMLInputElement>('#preserve-breaks');

if (
  !streamInput ||
  !toggleEnglish ||
  !modeLabel ||
  !romanInput ||
  !bengaliOutput ||
  !transpileRun ||
  !preserveBreaks
) {
  throw new Error('Playground markup is missing expected elements');
}

const ime = new BengaliIME();

const refreshModeLabel = () => {
  modeLabel.textContent = ime.isEnglishMode ? 'English mode' : 'Bengali / phonetic';
};

refreshModeLabel();

toggleEnglish.addEventListener('click', () => {
  ime.toggleEnglishMode();
  refreshModeLabel();
});

streamInput.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) {
    return;
  }

  if (e.key.length !== 1 && e.key !== 'Backspace' && e.key !== 'Enter') {
    return;
  }

  const beforeValue = streamInput.value;
  const caret = streamInput.selectionStart;
  const selEnd = streamInput.selectionEnd;

  if (caret !== selEnd) {
    return;
  }

  e.preventDefault();

  resyncImeIfPrefixDrifted(ime, beforeValue, caret);

  let actions: IMEAction[];
  if (e.key === 'Backspace') {
    actions = ime.processBackspace();
  } else {
    actions = ime.process(e.key, {
      textBeforeCaret: beforeValue.slice(0, caret),
    });
  }

  if (actions.length === 0) {
    return;
  }

  const { value, caret: nextCaret } = applyImeActionsAtCaret(beforeValue, caret, actions);
  streamInput.value = value;
  streamInput.selectionStart = nextCaret;
  streamInput.selectionEnd = nextCaret;
});

const runBulk = () => {
  const raw = romanInput.value;
  const out = transpileRomanDocument(raw, {
    preserveLineBreaks: preserveBreaks.checked,
  });
  bengaliOutput.value = out;
};

transpileRun.addEventListener('click', runBulk);
runBulk();
