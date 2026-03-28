import {
  Chart,
  BarController, LineController, DoughnutController, PieController,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler,
  type ChartDataset, type ChartOptions,
} from 'chart.js';

// Register required Chart.js components
Chart.register(
  BarController, LineController, DoughnutController, PieController,
  CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, ArcElement,
  Title, Tooltip, Legend, Filler,
);

// Square-inspired light theme colors
export const CHART_COLORS = {
  primary: '#006aff',
  secondary: '#5cb9f2',
  teal: '#0e7490',
  navy: '#1e3a5f',
  dark: '#1a1a2e',
  purple: '#7c3aed',
  hermes: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  white: '#ffffff',
  muted: '#6b7280',
  gridLine: 'rgba(0, 0, 0, 0.06)',
  border: '#e5e7eb',
};

const PALETTE = [
  CHART_COLORS.primary,
  CHART_COLORS.secondary,
  CHART_COLORS.teal,
  CHART_COLORS.success,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.info,
  CHART_COLORS.purple,
  CHART_COLORS.hermes,
];

function lightThemeDefaults(): Partial<ChartOptions> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: CHART_COLORS.muted, font: { size: 11 } },
      },
      tooltip: {
        backgroundColor: CHART_COLORS.white,
        borderColor: CHART_COLORS.border,
        borderWidth: 1,
        titleColor: CHART_COLORS.dark,
        bodyColor: CHART_COLORS.dark,
      },
    },
    scales: {
      x: {
        ticks: { color: CHART_COLORS.muted, font: { size: 10 } },
        grid: { color: CHART_COLORS.gridLine },
      },
      y: {
        ticks: { color: CHART_COLORS.muted, font: { size: 10 } },
        grid: { color: CHART_COLORS.gridLine },
      },
    },
  };
}

export function createBarChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  datasets: ChartDataset<'bar'>[],
  options?: Partial<ChartOptions<'bar'>>,
): Chart<'bar'> {
  const defaults = lightThemeDefaults() as ChartOptions<'bar'>;
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: datasets.map((ds, i) => ({
        backgroundColor: ds.backgroundColor ?? PALETTE[i % PALETTE.length],
        borderRadius: 4,
        ...ds,
      })),
    },
    options: { ...defaults, ...options },
  });
}

export function createLineChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  datasets: ChartDataset<'line'>[],
  options?: Partial<ChartOptions<'line'>>,
): Chart<'line'> {
  const defaults = lightThemeDefaults() as ChartOptions<'line'>;
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: datasets.map((ds, i) => ({
        borderColor: ds.borderColor ?? PALETTE[i % PALETTE.length],
        backgroundColor: ds.backgroundColor ?? 'transparent',
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 5,
        ...ds,
      })),
    },
    options: { ...defaults, ...options },
  });
}

export function createDoughnutChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  data: number[],
  options?: Partial<ChartOptions<'doughnut'>>,
): Chart<'doughnut'> {
  return new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: PALETTE.slice(0, data.length),
        borderColor: CHART_COLORS.white,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: CHART_COLORS.muted, font: { size: 11 }, padding: 12 },
        },
        tooltip: {
          backgroundColor: CHART_COLORS.white,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: CHART_COLORS.dark,
          bodyColor: CHART_COLORS.dark,
        },
      },
      ...options,
    },
  });
}

export function createPieChart(
  canvas: HTMLCanvasElement,
  labels: string[],
  data: number[],
  options?: Partial<ChartOptions<'pie'>>,
): Chart<'pie'> {
  return new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: PALETTE.slice(0, data.length),
        borderColor: CHART_COLORS.white,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: CHART_COLORS.muted, font: { size: 11 }, padding: 12 },
        },
        tooltip: {
          backgroundColor: CHART_COLORS.white,
          borderColor: CHART_COLORS.border,
          borderWidth: 1,
          titleColor: CHART_COLORS.dark,
          bodyColor: CHART_COLORS.dark,
        },
      },
      ...options,
    },
  });
}

export function destroyChart(chart: Chart | null): void {
  if (chart) {
    chart.destroy();
  }
}
