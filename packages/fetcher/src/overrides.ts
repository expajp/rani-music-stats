import { songKey, type DayFile, type YearOverrides, type YearsFile } from '@rani/core';
import { todayJst } from './dates';
import {
  OVERRIDES_DRAFT_FILE,
  OVERRIDES_FILE,
  readAllDays,
  readOverrides,
  readOverridesDraft,
  readYears,
  writeOverrides,
  writeOverridesDraft,
} from './store';

const MIN_YEAR = 1900;

/** 発表年が不明で、まだ手で補完していない曲キーを、オンエア回数の多い順に返す */
export function draftKeys(days: DayFile[], years: YearsFile, overrides: YearOverrides): string[] {
  const counts = new Map<string, number>();
  for (const day of days) {
    for (const p of day.plays) {
      const key = songKey(p.title, p.artist);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts]
    .filter(([key]) => years[key]?.year === null && !(key in overrides))
    .sort(([a, ca], [b, cb]) => cb - ca || a.localeCompare(b))
    .map(([key]) => key);
}

export interface ApplyResult {
  overrides: YearOverrides;
  /** 年がまだ書かれていない曲と、年として読めない値が書かれた曲。下書きに残す */
  remaining: Record<string, unknown>;
  /** 年として読めない値が書かれた曲 */
  invalid: string[];
  applied: number;
}

/** 下書きのうち年が書かれた曲を、手で補完した年に取り込む */
export function applyDraft(draft: Record<string, unknown>, overrides: YearOverrides, maxYear: number): ApplyResult {
  const next = { ...overrides };
  const remaining: Record<string, unknown> = {};
  const invalid: string[] = [];
  let applied = 0;
  for (const [key, value] of Object.entries(draft)) {
    if (value === null || value === '') {
      remaining[key] = null;
      continue;
    }
    const year = Number(value);
    if (!Number.isInteger(year) || year < MIN_YEAR || year > maxYear) {
      invalid.push(`${key.replace('\t', ' / ')}：${JSON.stringify(value)}`);
      remaining[key] = value;
      continue;
    }
    next[key] = year;
    applied += 1;
  }
  return { overrides: next, remaining, invalid, applied };
}

/** 発表年が不明な曲の下書きを data/year-overrides.draft.json に書き出す */
export async function runOverridesDraft(): Promise<void> {
  const keys = draftKeys(await readAllDays(), await readYears(), await readOverrides());
  const existing = await readOverridesDraft();
  if (existing && Object.values(existing).some((v) => v !== null)) {
    console.error(`${OVERRIDES_DRAFT_FILE} に記入済みの年があります。先に overrides:apply で取り込んでください`);
    process.exitCode = 1;
    return;
  }
  await writeOverridesDraft(Object.fromEntries(keys.map((k) => [k, null])));
  console.log(
    keys.length
      ? `${OVERRIDES_DRAFT_FILE} に${keys.length}曲を書き出しました。null を年に書き換えてから overrides:apply を実行してください`
      : '発表年が不明な曲はありません',
  );
}

/** 下書きに書いた年を data/year-overrides.json に取り込む */
export async function runOverridesApply(): Promise<void> {
  const draft = await readOverridesDraft();
  if (!draft) {
    console.error(`${OVERRIDES_DRAFT_FILE} がありません。先に overrides:draft を実行してください`);
    process.exitCode = 1;
    return;
  }
  const maxYear = Number(todayJst().slice(0, 4)) + 1;
  const result = applyDraft(draft, await readOverrides(), maxYear);
  await writeOverrides(result.overrides);
  await writeOverridesDraft(result.remaining);
  console.log(`${OVERRIDES_FILE} に${result.applied}曲を取り込みました。下書きに残った曲：${Object.keys(result.remaining).length}曲`);
  if (result.invalid.length) {
    console.warn(`年として読めない値は取り込まず、下書きに残しました（${MIN_YEAR}〜${maxYear} の整数で書いてください）：`);
    for (const line of result.invalid) console.warn(`  ${line}`);
  }
}
