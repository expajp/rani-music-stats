import { songKey } from './normalize';
import type { DayFile, PlayTuple, Song, SongsData, YearOverrides, YearsFile } from './types';

export interface Aggregated {
  songs: SongsData;
  plays: PlayTuple[];
}

/** オンエアデータと発表年のデータから、サイトが読み込む集計データを作る */
export function aggregate(
  days: DayFile[],
  years: YearsFile,
  overrides: YearOverrides,
  generatedAt: string,
): Aggregated {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const index = new Map<string, number>();
  const songs: Song[] = [];
  const plays: PlayTuple[] = [];

  for (const day of sorted) {
    for (const p of day.plays) {
      const key = songKey(p.title, p.artist);
      let i = index.get(key);
      if (i === undefined) {
        i = songs.length;
        index.set(key, i);
        songs.push({
          key,
          title: p.title.trim(),
          artist: p.artist.trim(),
          year: overrides[key] ?? years[key]?.year ?? null,
          firstDate: day.date,
          total: 0,
        });
      }
      songs[i]!.total += 1;
      plays.push([i, day.date, p.time]);
    }
  }

  const withPlays = sorted.filter((d) => d.plays.length > 0);
  return {
    songs: {
      generatedAt,
      earliestDate: withPlays[0]?.date ?? null,
      latestDate: withPlays.at(-1)?.date ?? null,
      songs,
    },
    plays,
  };
}

/** オンエアデータに出てくる曲を、曲キーごとに最初の表記で返す。発表年の検索に使う */
export function uniqueSongs(days: DayFile[]): Map<string, { title: string; artist: string }> {
  const result = new Map<string, { title: string; artist: string }>();
  for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const p of day.plays) {
      const key = songKey(p.title, p.artist);
      if (!result.has(key)) result.set(key, { title: p.title.trim(), artist: p.artist.trim() });
    }
  }
  return result;
}
