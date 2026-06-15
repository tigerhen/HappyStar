import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import TaskRow from "../components/TaskRow.jsx";

export default function TasksTab({ onBalance }) {
  const [tasks, setTasks] = useState([]);
  const [msg, setMsg] = useState("");
  const [flash, setFlash] = useState(null); // { id, ts }

  const load = () => api.tasks().then(setTasks);
  useEffect(() => { load(); }, []);

  const complete = async (id) => {
    try {
      const res = await api.completeTask(id);
      onBalance(res.balance);
      setFlash({ id, ts: Date.now() });
      await load();
    } catch (e) {
      setMsg(e.code === "daily_limit" ? "今天这个任务已达上限啦" : "出错了，再试试");
      setTimeout(() => setMsg(""), 2000);
    }
  };

  return (
    <div>
      {msg && <div style={{ background: "#fff4d6", color: "#8a6a10", padding: 8, borderRadius: 10, marginBottom: 8 }}>{msg}</div>}
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} onComplete={complete} flashTs={flash && flash.id === t.id ? flash.ts : null} />
      ))}
      {tasks.length === 0 && <p style={{ color: "var(--ink-soft)" }}>今天没有任务啦 🎉</p>}
    </div>
  );
}
