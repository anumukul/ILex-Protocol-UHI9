"use client";

import { useState, useEffect, useRef } from "react";
import { usePosition } from "@/hooks/usePosition";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface Props {
  address?: `0x${string}`;
}

const MAX_POINTS = 60;

export default function ILChart({ address }: Props) {
  const { currentIL, position } = usePosition(address);
  const [data, setData] = useState<{ time: string; il: number }[]>([]);
  const countRef = useRef(0);

  useEffect(() => {
    if (currentIL === undefined) return;
    const ilBps = Number(currentIL);
    const label = `${(countRef.current * 3).toString().padStart(2, "0")}s`;
    countRef.current++;
    setData((prev) => {
      const next = [...prev, { time: label, il: ilBps / 100 }];
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
    });
  }, [currentIL]);

  const threshold = Number(position?.ilThresholdBps || 500) / 100;

  if (data.length < 2) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <p className="text-xs text-gray-400">IL chart — collecting data...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <h4 className="text-xs font-medium text-gray-400">IL Over Time (%)</h4>
      <div className="mt-2 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, Math.max(threshold * 1.5, 1)]} hide />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
              labelStyle={{ color: "#9ca3af" }}
            />
            <Line type="monotone" dataKey="il" stroke="#34d399" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
