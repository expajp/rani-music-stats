import { describe, expect, it } from 'vitest';
import { normalizeText, songKey } from './normalize';

describe('normalizeText', () => {
  it('全角英数字と記号を半角にする', () => {
    expect(normalizeText('ＴＯＭＯＲＲＯＷ！')).toBe('tomorrow!');
  });

  it('全角スラッシュを半角にする', () => {
    expect(normalizeText('アン／ペア')).toBe('アン/ペア');
  });

  it('前後の空白を取り除き、連続する空白を1つにする', () => {
    expect(normalizeText('  What   Am　I ')).toBe('what am i');
  });

  it('小文字にする', () => {
    expect(normalizeText('Sweet Child O\'Mine')).toBe("sweet child o'mine");
  });
});

describe('songKey', () => {
  it('表記ゆれがあっても同じキーになる', () => {
    expect(songKey('What Am I ', "Why Don't We")).toBe(songKey('what am i', "WHY DON'T WE"));
  });

  it('曲名とアーティストをタブでつなぐ', () => {
    expect(songKey('Golden', 'HUNTR/X')).toBe('golden\thuntr/x');
  });

  it('アーティストが違えば別のキーになる', () => {
    expect(songKey('Hero', 'Enrique Iglesias')).not.toBe(songKey('Hero', 'Mariah Carey'));
  });
});
