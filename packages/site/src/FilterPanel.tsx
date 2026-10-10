import { addDays, type Filters } from './filters';

interface Props {
  filters: Filters;
  earliest: string;
  latest: string;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}

const PRESETS = [
  { label: '直近7日', days: 7 },
  { label: '直近30日', days: 30 },
  { label: '直近90日', days: 90 },
] as const;

export function FilterPanel({ filters, earliest, latest, onChange, onReset }: Props) {
  const isPreset = (from: string) => filters.to === latest && filters.from === from;

  return (
    <section className="card filters" aria-label="絞り込み条件">
      <div className="filter-row">
        <span className="filter-label">期間</span>
        <div className="presets">
          {PRESETS.map(({ label, days }) => {
            const from = addDays(latest, -(days - 1));
            return (
              <button
                key={days}
                type="button"
                className={isPreset(from) ? 'active' : ''}
                onClick={() => onChange({ from, to: latest })}
              >
                {label}
              </button>
            );
          })}
          <button
            type="button"
            className={isPreset(earliest) ? 'active' : ''}
            onClick={() => onChange({ from: earliest, to: latest })}
          >
            全期間
          </button>
        </div>
        <div className="range">
          <input
            type="date"
            aria-label="開始日"
            value={filters.from}
            min={earliest}
            max={latest}
            onChange={(e) => e.target.value && onChange({ from: e.target.value })}
          />
          <span>〜</span>
          <input
            type="date"
            aria-label="終了日"
            value={filters.to}
            min={earliest}
            max={latest}
            onChange={(e) => e.target.value && onChange({ to: e.target.value })}
          />
        </div>
      </div>

      <div className="filter-grid">
        <label>
          曲名
          <input type="search" value={filters.title} placeholder="部分一致" onChange={(e) => onChange({ title: e.target.value })} />
        </label>
        <label>
          アーティスト
          <input type="search" value={filters.artist} placeholder="部分一致" onChange={(e) => onChange({ artist: e.target.value })} />
        </label>
        <label>
          発表年
          <span className="range">
            <input
              type="number"
              inputMode="numeric"
              aria-label="発表年の下限"
              placeholder="1960"
              value={filters.yearMin}
              onChange={(e) => onChange({ yearMin: e.target.value })}
            />
            <span>〜</span>
            <input
              type="number"
              inputMode="numeric"
              aria-label="発表年の上限"
              placeholder="2026"
              value={filters.yearMax}
              onChange={(e) => onChange({ yearMax: e.target.value })}
            />
          </span>
        </label>
      </div>

      <div className="filter-row">
        <label className="inline">
          <input type="checkbox" checked={filters.newOnly} onChange={(e) => onChange({ newOnly: e.target.checked })} />
          期間内に初めて流れた曲だけ
        </label>
        <button type="button" className="link" onClick={onReset}>
          条件をリセット
        </button>
      </div>
      {(filters.yearMin || filters.yearMax) && <p className="hint">発表年で絞り込むと、発表年が不明の曲は表示しません。</p>}
    </section>
  );
}
