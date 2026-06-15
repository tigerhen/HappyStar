import React, { useState } from "react";
import ParentTasksAdmin from "./ParentTasksAdmin.jsx";
import CapacityPanel from "../components/CapacityPanel.jsx";

export default function ParentTasks() {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div className="hs-split">
      <div>
        <h3 className="hs-col-title">任务管理</h3>
        <ParentTasksAdmin onChanged={() => setReloadKey((k) => k + 1)} />
      </div>
      <div>
        <h3 className="hs-col-title">产能总览</h3>
        <CapacityPanel reloadKey={reloadKey} />
      </div>
    </div>
  );
}
