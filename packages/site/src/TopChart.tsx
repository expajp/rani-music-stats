import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip, type ChartOptions, type Plugin } from 'chart.js';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import type { Row } from './filters';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

const BAR_HEIGHT = 22;
// 狭い画面では、ラベルが軸の幅に収まるよう短くする
const labelMax = () => (window.innerWidth < 600 ? 14 : 28);

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

// 棒の右端に回数を描く
const VALUE_GAP = 4;
const valueLabels: Plugin<'bar'> = {
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const color = String(chart.options.scales?.y?.ticks?.color ?? '#666');
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `12px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textBaseline = 'middle';
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      ctx.fillText(String(chart.data.datasets[0]!.data[i]), bar.x + VALUE_GAP, bar.y);
    });
    ctx.restore();
  },
};

/** CSS の色トークンを読む。ダークモードの切り替えにも追従する */
function useThemeColors() {
  const read = () => {
    const css = getComputedStyle(document.documentElement);
    const v = (name: string) => css.getPropertyValue(name).trim();
    return { bar: v('--bar'), text: v('--text-muted'), grid: v('--border') };
  };
  const [colors, setColors] = useState(read);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setColors(read());
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return colors;
}

export function TopChart({ rows }: { rows: Row[] }) {
  const colors = useThemeColors();
  const [max, setMax] = useState(labelMax);
  useEffect(() => {
    const onResize = () => setMax(labelMax());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const data = {
    labels: rows.map((r) => truncate(`${r.song.title} / ${r.song.artist}`, max)),
    datasets: [
      {
        data: rows.map((r) => r.count),
        backgroundColor: colors.bar,
        borderRadius: 3,
        barThickness: BAR_HEIGHT - 6,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    animation: false,
    // 最も長い棒の右にも回数が収まるよう、右に余白を取る
    layout: { padding: { right: 32 } },
    plugins: {
      tooltip: {
        callbacks: {
          title: (items) => {
            const r = rows[items[0]!.dataIndex]!;
            return `${r.song.title} / ${r.song.artist}`;
          },
          label: (item) => `${item.parsed.x}回`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: { precision: 0, color: colors.text },
        grid: { color: colors.grid },
        border: { display: false },
      },
      y: {
        ticks: { color: colors.text, autoSkip: false },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="chart" style={{ height: rows.length * BAR_HEIGHT + 40 }}>
      <Bar data={data} options={options} plugins={[valueLabels]} />
    </div>
  );
}
