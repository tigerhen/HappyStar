import React from "react";
import MeasurementChart from "./MeasurementChart.jsx";

function changeText(value, unit) {
  if (value === null || value === undefined) return "首次记录";
  const sign = value > 0 ? "+" : "";
  return `较上次 ${sign}${value} ${unit}`;
}

function metricText(value, unit) {
  return Number.isFinite(value) ? `${value} ${unit}` : "未测";
}

export default function MeasurementsView({ data, onEdit, onDelete, disabled = false }) {
  const records = data?.records || [];
  const summary = data?.summary || {};
  const latest = summary.latest;
  const latestHeight = summary.latestHeight || (Number.isFinite(latest?.heightCm) ? latest : null);
  const latestWeight = summary.latestWeight || (Number.isFinite(latest?.weightKg) ? latest : null);
  const newestFirst = [...records].reverse();
  const reminder = !latest
    ? "建议现在进行首次测量"
    : summary.due
      ? "已到建议测量时间"
      : `下次建议测量：${summary.nextSuggestedDate}`;

  return (
    <div className="bm-view">
      <div className={`bm-reminder${summary.due ? " due" : ""}`}>
        <span aria-hidden="true">季</span>
        <div><strong>{reminder}</strong>{latest && <small>最近测量：{latest.date}，建议每 3 个月测量一次</small>}</div>
      </div>

      {latest && (
        <section className="bm-summary" aria-label="最近一次测量">
          <div>
            <span>身高</span>
            <strong>{metricText(latestHeight?.heightCm, "cm")}</strong>
            <small>{latestHeight ? changeText(summary.heightChange, "cm") : "暂无记录"}</small>
          </div>
          <div>
            <span>体重</span>
            <strong>{metricText(latestWeight?.weightKg, "kg")}</strong>
            <small>{latestWeight ? changeText(summary.weightChange, "kg") : "暂无记录"}</small>
          </div>
        </section>
      )}

      <div className="bm-charts">
        <MeasurementChart title="身高趋势" unit="cm" records={records} valueKey="heightCm" color="#b14a6b" />
        <MeasurementChart title="体重趋势" unit="kg" records={records} valueKey="weightKg" color="#185fa5" />
      </div>

      {newestFirst.length > 0 && (
        <section className="bm-history">
          <h3>测量记录</h3>
          <div className="bm-history-list">
            {newestFirst.map((record) => (
              <article className="bm-history-row" key={record.id || record.date}>
                <time dateTime={record.date}>{record.date}</time>
                <div className="bm-history-values"><b>{metricText(record.heightCm, "cm")}</b><b>{metricText(record.weightKg, "kg")}</b></div>
                {record.note && <p>{record.note}</p>}
                {(onEdit || onDelete) && (
                  <div className="bm-history-actions">
                    {onEdit && <button type="button" disabled={disabled} title="编辑" aria-label={`编辑 ${record.date} 的记录`} onClick={() => onEdit(record)}>✎</button>}
                    {onDelete && <button type="button" disabled={disabled} title="删除" aria-label={`删除 ${record.date} 的记录`} onClick={() => onDelete(record)}>×</button>}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
