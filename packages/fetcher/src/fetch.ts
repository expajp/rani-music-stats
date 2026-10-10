import { extractPlays, type OfficialEntry, type Play } from '@rani/core';
import { addDays, isWeekday } from './dates';
import { getJson, throttle } from './http';
import { dayFileExists, readDay, writeDay } from './store';

const INTERVAL_MS = 2_000;
// 当日の訂正を拾うため、直近この日数はファイルがあっても取り直す
const REFRESH_DAYS = 2;

export interface FetchTarget {
  date: string;
  refresh: boolean;
}

/** 取得するべき日を決める。未保存の日と、直近 REFRESH_DAYS 日を対象にし、未来の日は除く */
export function planFetch(dates: string[], exists: (date: string) => boolean, today: string): FetchTarget[] {
  const refreshFrom = addDays(today, -(REFRESH_DAYS - 1));
  return dates
    .filter((d) => d <= today)
    .flatMap((date): FetchTarget[] => {
      if (!exists(date)) return [{ date, refresh: false }];
      if (date >= refreshFrom) return [{ date, refresh: true }];
      return [];
    });
}

function officialUrl(date: string): string {
  return `https://www.radionikkei.jp/json/${date.replaceAll('-', '')}.json`;
}

const samePlays = (a: Play[], b: Play[]) => JSON.stringify(a) === JSON.stringify(b);

/** 公式JSONを取得し、曲の項目だけを保存する。今日のぶんに問題があれば false を返す */
export async function runFetch(dates: string[], today: string): Promise<boolean> {
  const targets = planFetch(dates, dayFileExists, today);
  const throttled = throttle(INTERVAL_MS);
  let todayOk = true;

  console.log(`取得対象：${targets.length}日`);
  for (const { date, refresh } of targets) {
    const { status, body } = await throttled(() => getJson(officialUrl(date))).catch((e: Error) => ({
      status: 0,
      body: `${e.name}: ${e.message}`,
    }));
    if (!Array.isArray(body)) {
      console.warn(`::warning::${date} の取得に失敗しました（HTTP ${status}${typeof body === 'string' ? `, ${body}` : ''}）`);
      if (date === today) todayOk = false;
      continue;
    }

    const plays = extractPlays(body as OfficialEntry[]);
    if (date === today && isWeekday(date) && plays.length === 0) {
      console.warn(`::warning::${date} は平日なのに曲が0件でした`);
      todayOk = false;
    }

    if (refresh) {
      const old = await readDay(date);
      if (old && samePlays(old.plays, plays)) {
        console.log(`${date}：変更なし（${plays.length}曲）`);
        continue;
      }
    }
    await writeDay({ date, fetchedAt: new Date().toISOString(), plays });
    console.log(`${date}：${refresh ? '更新' : '保存'}（${plays.length}曲）`);
  }
  return todayOk;
}
