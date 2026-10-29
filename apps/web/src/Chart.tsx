import { useEffect, useRef } from "react";
import * as echarts from "echarts";
export default function Chart({
  option,
  onSelect,
  label,
}: {
  option: echarts.EChartsOption;
  onSelect?: (name: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      ...option,
      animation: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    const resize = new ResizeObserver(() => chart.resize());
    resize.observe(ref.current);
    if (onSelect) chart.on("click", (e) => onSelect(e.name));
    return () => {
      resize.disconnect();
      chart.dispose();
    };
  }, [option, onSelect]);
  return <div className="chart" ref={ref} role="img" aria-label={label} />;
}
