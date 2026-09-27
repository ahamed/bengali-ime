import { BengaliIME } from './bengali-ime';
import { symbols } from './bengali-ime-data';

export type TranspileRomanDocumentOptions = {
  preserveLineBreaks?: boolean;
};

const insertNewlinesAtBreaks = (body: string, breakPositions: number[]): string => {
  if (breakPositions.length === 0) {
    return body;
  }
  const ascending = [...breakPositions].sort((a, b) => a - b);
  let result = body;
  let offset = 0;
  for (const position of ascending) {
    const at = position + offset;
    result = `${result.slice(0, at)}\n${result.slice(at)}`;
    offset += 1;
  }
  return result;
};

export const transpileRomanDocument = (
  document: string,
  options?: TranspileRomanDocumentOptions,
): string => {
  const preserveLineBreaks = options?.preserveLineBreaks ?? true;
  const ime = new BengaliIME();
  const breakPositions: number[] = [];
  const enterKey = symbols.get('ENTER_KEY')!;

  for (const char of document) {
    const key = preserveLineBreaks && char === '\n' ? enterKey : char;
    const actions = ime.process(key);
    for (const action of actions) {
      if (action.type === 'splitBlock') {
        breakPositions.push(ime.output.length);
      }
    }
  }

  return insertNewlinesAtBreaks(ime.output, breakPositions);
};
