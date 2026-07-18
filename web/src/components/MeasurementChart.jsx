import React from "react";

const WIDTH = 600;
const HEIGHT = 240;
const PADDING = { top: 30, right: 24, bottom: 42, left: 48 };

function dayNumber(value) {
  return Date.parse(`${value}T00:00:00Z`) / 86400000;
}

function shortDate(value) {
  return value.slice(5).replace("-", "/");
}

export default function MeasurementChart({ title, unit, records, valueKey, color }) {
  const points = records
    .filter((record) => Number.isFinite(record[valueKey]))
    .map((record) => ({ date: record.date, day: dayNumber(record.date), value: record[valueKey] }));

  if (!points.length) {
    return (
      <section className="bm-chart">
        <h3>{title}</h3>
        <div className="bm-chart-empty">还没有测量记录</div>
      </section>
    );
  }

  const days = points.map((point) => point.day);
  const values = points.map((point) => point.value);
  const firstDay = Math.min(...days);
  const lastDay = Math.max(...days);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = rawMax - rawMin || Math.max(rawMax * 0.05, 1);
  const minValue = rawMin - spread * 0.12;
  const maxValue = rawMax + spread * 0.12;
  const chartWidth = WIDTH - PADDING.left - PADDING.right;
  const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const x = (point) => firstDay === lastDay
    ? PADDING.left + chartWidth / 2
    : PADDING.left + ((point.day - firstDay) / (lastDay - firstDay)) * chartWidth;
  const y = (value) => PADDING.top + ((maxValue - value) / (maxValue - minValue)) * chartHeight;
  const coordinates = points.map((point) => `${x(point)},${y(point.value)}`).join(" ");
  const gridValues = [maxValue, (maxValue + minValue) / 2, minValue];

  return (
    <section className="bm-chart">
      <h3>{title}</h3>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${title}曲线图`}>
        {gridValues.map((value) => (
          <g key={value}>
            <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y(value)} y2={y(value)} className="bm-grid-line" />
            <text x={PADDING.left - 8} y={y(value) + 4} textAnchor="end" className="bm-axis-label">{value.toFixed(1)}</text>
          </g>
        ))}
        {points.length > 1 && <polyline points={coordinates} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        {points.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={x(point)} cy={y(point.value)} r="6" fill="#fff" stroke={color} strokeWidth="4">
              <title>{point.date}：{point.value} {unit}</title>
            </circle>
            {(points.length <= 4 || index === points.length - 1) && (
              <text x={x(point)} y={y(point.value) - 13} textAnchor="middle" className="bm-point-label" fill={color}>{point.value} {unit}</text>
            )}
          </g>
        ))}
        <text x={PADDING.left} y={HEIGHT - 12} textAnchor="start" className="bm-axis-label">{shortDate(points[0].date)}</text>
        {points.length > 1 && <text x={WIDTH - PADDING.right} y={HEIGHT - 12} textAnchor="end" className="bm-axis-label">{shortDate(points.at(-1).date)}</text>}
      </svg>
      {points.length === 1 && <div className="bm-chart-hint">再测量 1 次即可形成趋势</div>}
    </section>
  );
}
