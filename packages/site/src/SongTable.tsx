import type { PlayTuple } from '@rani/core';
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { Filters, Row, SortKey } from './filters';

const PAGE_SIZE = 100;

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'title', label: '曲名' },
  { key: 'artist', label: 'アーティスト' },
  { key: 'year', label: '発表年', numeric: true },
  { key: 'count', label: '回数', numeric: true },
  { key: 'firstDate', label: '初回オンエア日' },
];

interface Props {
  rows: Row[];
  plays: PlayTuple[];
  filters: Filters;
  onSort: (patch: Partial<Filters>) => void;
}

export function SongTable({ rows, plays, filters, onSort }: Props) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => setLimit(PAGE_SIZE), [rows]);

  const sortBy = (key: SortKey) => {
    // 同じ列なら向きを反転し、別の列なら文字列は昇順・数値と日付は降順から始める
    if (filters.sort === key) onSort({ desc: !filters.desc });
    else onSort({ sort: key, desc: key === 'count' || key === 'year' || key === 'firstDate' });
  };

  if (rows.length === 0) return <p className="message">条件に合う曲がありません。</p>;

  return (
    <>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th
                  key={c.key}
                  className={c.numeric ? 'num' : ''}
                  aria-sort={filters.sort === c.key ? (filters.desc ? 'descending' : 'ascending') : 'none'}
                >
                  <button type="button" onClick={() => sortBy(c.key)}>
                    {c.label}
                    <span className="sort-mark">{filters.sort === c.key ? (filters.desc ? '▼' : '▲') : ''}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r) => (
              <Fragment key={r.index}>
                <tr
                  className={open === r.index ? 'open' : ''}
                  onClick={() => setOpen(open === r.index ? null : r.index)}
                  aria-expanded={open === r.index}
                >
                  <td>{r.song.title}</td>
                  <td>{r.song.artist}</td>
                  <td className="num">{r.song.year ?? <span className="muted">不明</span>}</td>
                  <td className="num">{r.count}</td>
                  <td>{r.song.firstDate}</td>
                </tr>
                {open === r.index && (
                  <tr className="detail">
                    <td colSpan={COLUMNS.length}>
                      <PlayList songIndex={r.index} plays={plays} from={filters.from} to={filters.to} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <button type="button" className="more" onClick={() => setLimit(limit + PAGE_SIZE)}>
          さらに表示（残り{(rows.length - limit).toLocaleString()}曲）
        </button>
      )}
    </>
  );
}

function PlayList({ songIndex, plays, from, to }: { songIndex: number; plays: PlayTuple[]; from: string; to: string }) {
  const list = useMemo(
    () => plays.filter(([i, date]) => i === songIndex && from <= date && date <= to).reverse(),
    [songIndex, plays, from, to],
  );
  return (
    <div>
      <p className="muted">期間内のオンエア（新しい順）</p>
      <ul className="plays">
        {list.map(([, date, time]) => (
          <li key={`${date} ${time}`}>
            {date} {time.slice(0, 5)}
          </li>
        ))}
      </ul>
    </div>
  );
}
