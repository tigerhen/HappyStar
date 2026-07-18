import React, { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import MeasurementsView from "../components/MeasurementsView.jsx";

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function emptyForm() {
  return { date: localDate(), heightCm: "", weightKg: "", note: "" };
}

const ERRORS = {
  measurement_date_exists: "该日期已有记录，请直接编辑原记录",
  bad_date: "请选择正确的测量日期",
  bad_height: "身高需为大于 0 的数字，最多保留一位小数",
  bad_weight: "体重需为大于 0 的数字，最多保留两位小数",
  measurement_value_required: "身高和体重至少填写一项",
};

export default function ParentMeasurements() {
  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");
  const [data, setData] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const loadVersion = useRef(0);

  useEffect(() => {
    api.children().then((rows) => {
      setChildren(rows);
      setChildId((current) => current || rows[0]?.id || "");
    }).catch(() => setError("孩子列表加载失败"));
  }, []);

  const reload = async (id = childId) => {
    if (!id) return;
    const version = ++loadVersion.current;
    try {
      const next = await api.adminMeasurements(id);
      if (version === loadVersion.current) setData(next);
    } catch (requestError) {
      if (version === loadVersion.current) throw requestError;
    }
  };

  useEffect(() => {
    if (!childId) return;
    setData(null);
    setEditingId(null);
    setForm(emptyForm());
    setError("");
    reload(childId).catch(() => setError("测量记录加载失败，请稍后重试"));
  }, [childId]);

  const save = async (event) => {
    event.preventDefault();
    setError("");
    const heightCm = form.heightCm === "" ? null : Number(form.heightCm);
    const weightKg = form.weightKg === "" ? null : Number(form.weightKg);
    if (heightCm === null && weightKg === null) {
      setError(ERRORS.measurement_value_required);
      return;
    }
    const payload = {
      childId,
      date: form.date,
      heightCm,
      weightKg,
      note: form.note.trim(),
    };
    setBusy(true);
    try {
      if (editingId) await api.adminUpdateMeasurement(editingId, payload);
      else await api.adminCreateMeasurement(payload);
      setEditingId(null);
      setForm(emptyForm());
      await reload();
    } catch (requestError) {
      setError(ERRORS[requestError.code] || "保存失败，请检查输入后重试");
    } finally {
      setBusy(false);
    }
  };

  const edit = (record) => {
    setEditingId(record.id);
    setForm({
      date: record.date,
      heightCm: record.heightCm === null || record.heightCm === undefined ? "" : String(record.heightCm),
      weightKg: record.weightKg === null || record.weightKg === undefined ? "" : String(record.weightKg),
      note: record.note || "",
    });
    setError("");
    document.querySelector(".bm-form")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const cancel = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError("");
  };

  const remove = async (record) => {
    if (!window.confirm(`确认删除 ${record.date} 的测量记录？`)) return;
    setError("");
    setBusy(true);
    try {
      await api.adminDeleteMeasurement(record.id);
      if (editingId === record.id) cancel();
      await reload();
    } catch {
      setError("删除失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bm-admin-layout">
      <aside className="bm-admin-tools">
        <label className="bm-field">
          <span>孩子</span>
          <select value={childId} disabled={busy} onChange={(event) => { loadVersion.current += 1; setChildId(event.target.value); }}>
            {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </select>
        </label>
        <form className="bm-form" onSubmit={save}>
          <div className="bm-form-head">
            <div><small>{editingId ? "正在修改" : "记录成长"}</small><h3>{editingId ? "编辑测量记录" : "新增测量记录"}</h3></div>
            {editingId && <button type="button" className="bm-cancel" onClick={cancel}>取消</button>}
          </div>
          <label className="bm-field"><span>测量日期</span><input type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
          <div className="bm-form-row">
            <label className="bm-field"><span>身高（cm）</span><input aria-label="身高（cm）" type="number" min="1" max="300" step="0.1" value={form.heightCm} onChange={(event) => setForm({ ...form, heightCm: event.target.value })} placeholder="未测可留空" /></label>
            <label className="bm-field"><span>体重（kg）</span><input aria-label="体重（kg）" type="number" min="1" max="500" step="0.01" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} placeholder="未测可留空" /></label>
          </div>
          <label className="bm-field"><span>备注（可选）</span><input maxLength="200" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="如：暑假测量" /></label>
          {error && <div className="bm-form-error" role="alert">{error}</div>}
          <button className="gp-primary bm-submit" disabled={busy || !childId}>{busy ? "正在保存…" : editingId ? "保存修改" : "添加记录"}</button>
        </form>
      </aside>
      <main className="bm-admin-preview">
        {!data ? <div className="bm-message">正在加载测量记录…</div> : <MeasurementsView data={data} onEdit={edit} onDelete={remove} disabled={busy} />}
      </main>
    </div>
  );
}
