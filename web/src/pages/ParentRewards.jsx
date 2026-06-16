import React, { useState } from "react";
import ParentRewardsAdmin from "./ParentRewardsAdmin.jsx";
import CapacityPanel from "../components/CapacityPanel.jsx";

export default function ParentRewards() {
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div className="hs-split">
      <div>
        <h3 className="hs-col-title">奖励管理</h3>
        <ParentRewardsAdmin onChanged={() => setReloadKey((k) => k + 1)} />
      </div>
      <div>
        <h3 className="hs-col-title">产能总览</h3>
        <CapacityPanel reloadKey={reloadKey} />
      </div>
    </div>
  );
}
