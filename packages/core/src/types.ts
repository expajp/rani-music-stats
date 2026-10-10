/** 公式オンエアJSON（https://www.radionikkei.jp/json/YYYYMMDD.json）の1要素。保存はしない */
export interface OfficialEntry {
  id?: string;
  time: string;
  title: string;
  artist: string;
  [key: string]: unknown;
}

/** 1回のオンエア。値は公式JSONのまま（正規化しない） */
export interface Play {
  time: string;
  title: string;
  artist: string;
}

/** data/onair/YYYY/YYYY-MM-DD.json の中身 */
export interface DayFile {
  date: string;
  fetchedAt: string;
  plays: Play[];
}

export interface ItunesHit {
  trackId: number;
  trackName: string;
  artistName: string;
  releaseDate: string;
}

export interface YearEntry {
  year: number | null;
  lookedUpAt: string;
  itunes: ItunesHit | null;
}

/** data/years.json の中身（曲キー → 検索結果） */
export type YearsFile = Record<string, YearEntry>;

/** data/year-overrides.json の中身（曲キー → 年） */
export type YearOverrides = Record<string, number>;

/** サイトが読み込む曲のデータ */
export interface Song {
  key: string;
  title: string;
  artist: string;
  year: number | null;
  firstDate: string;
  total: number;
}

export interface SongsData {
  generatedAt: string;
  earliestDate: string | null;
  latestDate: string | null;
  songs: Song[];
}

/** [songs の添字, "YYYY-MM-DD", "HH:MM:SS"] */
export type PlayTuple = [number, string, string];
