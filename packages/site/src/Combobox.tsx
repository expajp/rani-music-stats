import { normalizeText } from '@rani/core';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Candidate } from './filters';

const MAX_OPTIONS = 100;

interface Props {
  label: string;
  value: string;
  exact: boolean;
  options: Candidate[];
  /** exact は、候補から選んだとき true、入力したとき false */
  onChange: (value: string, exact: boolean) => void;
}

/** 入力すると候補が絞り込まれるプルダウン。候補を選ぶか、入力した文字列のまま部分一致で使う */
export function Combobox({ label, value, exact, options, onChange }: Props) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // 候補から選んだ直後に開いたときは、ほかの候補も選び直せるよう全件を出す
  const query = exact ? '' : normalizeText(value);
  const matched = useMemo(
    () => (query ? options.filter((o) => normalizeText(o.label).includes(query)) : options),
    [options, query],
  );
  const shown = matched.slice(0, MAX_OPTIONS);

  const select = (o: Candidate) => {
    onChange(o.label, true);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => Math.max(-1, Math.min(shown.length - 1, i + step)));
    } else if (e.key === 'Enter' && open && shown[active]) {
      e.preventDefault();
      select(shown[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div
        className="combobox"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
        }}
      >
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          autoComplete="off"
          placeholder="入力すると候補を絞り込みます"
          value={value}
          onChange={(e) => {
            onChange(e.target.value, false);
            setOpen(true);
            setActive(-1);
          }}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {value && (
          <button
            type="button"
            className="combobox-clear"
            aria-label={`${label}の条件を消す`}
            onClick={() => {
              onChange('', false);
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        )}
        <button
          type="button"
          className="combobox-toggle"
          aria-label={`${label}の候補を${open ? '閉じる' : '開く'}`}
          tabIndex={-1}
          onClick={() => {
            setOpen(!open);
            inputRef.current?.focus();
          }}
        >
          ▾
        </button>
        {open && (
          <ul id={`${id}-list`} role="listbox" className="combobox-list">
            {shown.map((o, i) => (
              <li
                key={o.label}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'active' : ''}
                // クリックで入力欄のフォーカスが外れて一覧が閉じないようにする
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(o)}
              >
                <span>{o.label}</span>
                <span className="muted">{o.count}回</span>
              </li>
            ))}
            {shown.length === 0 && <li className="combobox-empty">候補がありません</li>}
            {matched.length > shown.length && (
              <li className="combobox-empty">ほか{(matched.length - shown.length).toLocaleString()}件。入力して絞り込んでください</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
