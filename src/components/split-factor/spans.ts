/** One span of a line as edited in a form: text until it is parsed. */
export interface SpanRow {
  length: string;
  towerFootingResistance: string;
}

export interface SpanValues {
  length: number;
  towerFootingResistance: number;
}

export const MAX_SPANS = 200;

export const uniformRows = (
  count: number,
  length: string,
  towerFootingResistance: string
): SpanRow[] => Array.from({ length: count }, () => ({ length, towerFootingResistance }));

/** True when every span has the same length and footing resistance. */
export const isUniform = (spans: readonly SpanValues[]): boolean =>
  spans.every(
    (span) =>
      span.length === spans[0].length &&
      span.towerFootingResistance === spans[0].towerFootingResistance
  );

/** Spans as text rows, for the per-span editor. */
export const toRows = (spans: readonly SpanValues[]): SpanRow[] =>
  spans.map((span) => ({
    length: String(span.length),
    towerFootingResistance: String(span.towerFootingResistance),
  }));

/** The text rows as numbers, or what is wrong with them. */
export function parseRows(
  rows: readonly SpanRow[],
  minimum: number
): { ok: true; spans: SpanValues[] } | { ok: false; problem: string } {
  if (rows.length < minimum) {
    return { ok: false, problem: `حداقل ${minimum} span لازم است.` };
  }
  if (rows.length > MAX_SPANS) {
    return { ok: false, problem: `حداکثر ${MAX_SPANS} span مجاز است.` };
  }

  const spans: SpanValues[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const length = rows[i].length.trim() === '' ? NaN : Number(rows[i].length);
    const footing =
      rows[i].towerFootingResistance.trim() === ''
        ? NaN
        : Number(rows[i].towerFootingResistance);
    if (!(length > 0) || !(footing > 0)) {
      return {
        ok: false,
        problem: `span ${i + 1}: طول و مقاومت پایه دکل باید عددهای بزرگ‌تر از صفر باشند.`,
      };
    }
    spans.push({ length, towerFootingResistance: footing });
  }
  return { ok: true, spans };
}

/** The mean length and footing resistance of spans, for the uniform fields. */
export const meanOf = (spans: readonly SpanValues[]) => ({
  length: spans.reduce((sum, span) => sum + span.length, 0) / spans.length,
  towerFootingResistance:
    spans.reduce((sum, span) => sum + span.towerFootingResistance, 0) / spans.length,
});
