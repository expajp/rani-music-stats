import type { PlayTuple, SongsData } from '@rani/core';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FilterPanel } from './FilterPanel';
import { applyFilters, defaultFilters, filtersFromQuery, filtersToQuery, TOP_N_OPTIONS, topRows, type Filters } from './filters';
import { SongTable } from './SongTable';
import { TopChart } from './TopChart';

interface Data {
  songs: SongsData;
  plays: PlayTuple[];
}

async function loadData(): Promise<Data> {
  const base = `${import.meta.env.BASE_URL}data/`;
  const [songs, plays] = await Promise.all(
    ['songs.json', 'plays.json'].map(async (name) => {
      const res = await fetch(base + name);
      if (!res.ok) throw new Error(`${name} を読み込めませんでした（HTTP ${res.status}）`);
      return res.json();
    }),
  );
  return { songs, plays };
}

export function App() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData().then(setData, (e: Error) => setError(e.message));
  }, []);

  if (error) return <Shell><p className="message">{error}</p></Shell>;
  if (!data) return <Shell><p className="message">読み込み中…</p></Shell>;
  if (!data.songs.latestDate) return <Shell><p className="message">まだデータがありません。</p></Shell>;
  return <Stats data={data} latest={data.songs.latestDate} />;
}

function Shell({ children, note }: { children: ReactNode; note?: string }) {
  return (
    <div className="page">
      <header className="header">
        <h1>RaNi Music Stats</h1>
        <p className="lead">
          ラジオNIKKEI第2「RaNi Music」で流れた曲の記録
          {note && <span className="note">{note}</span>}
        </p>
      </header>
      {children}
      <footer className="footer">
        曲目は <a href="https://www.radionikkei.jp/ranimusic/onair/">楽曲 ON AIR リスト</a> をもとに記録しています。
        発表年は iTunes Search API の検索結果で、実際と違う場合があります。
      </footer>
    </div>
  );
}

function Stats({ data, latest }: { data: Data; latest: string }) {
  const defaults = useMemo(() => defaultFilters(latest), [latest]);
  const [filters, setFilters] = useState<Filters>(() => filtersFromQuery(location.search, defaults));

  useEffect(() => {
    history.replaceState(null, '', `${location.pathname}${filtersToQuery(filters, defaults)}`);
  }, [filters, defaults]);

  const rows = useMemo(() => applyFilters(data.songs.songs, data.plays, filters), [data, filters]);
  const top = useMemo(() => topRows(rows, filters.topN), [rows, filters.topN]);
  const update = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  const earliest = data.songs.earliestDate ?? latest;
  return (
    <Shell note={`記録の期間：${earliest} 〜 ${latest}`}>
      <FilterPanel filters={filters} earliest={earliest} latest={latest} onChange={update} onReset={() => setFilters(defaults)} />
      <section className="card">
        <div className="card-head">
          <h2>オンエア回数の多い曲</h2>
          <label className="inline">
            表示する曲数
            <select value={filters.topN} onChange={(e) => update({ topN: Number(e.target.value) })}>
              {TOP_N_OPTIONS.map((n) => (
                <option key={n} value={n}>上位{n}曲</option>
              ))}
            </select>
          </label>
        </div>
        {top.length > 0 ? <TopChart rows={top} /> : <p className="message">条件に合う曲がありません。</p>}
      </section>
      <section className="card">
        <div className="card-head">
          <h2>曲の一覧</h2>
          <span className="muted">{rows.length.toLocaleString()}曲</span>
        </div>
        <SongTable rows={rows} plays={data.plays} filters={filters} onSort={update} />
      </section>
    </Shell>
  );
}
