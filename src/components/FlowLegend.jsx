import { flowColors } from '../data/requestFlow.js';

export default function FlowLegend() {
  return <div className="flow-legend" aria-label="流程图例">
    {[['request','请求 →'],['data','文件数据 →'],['result','处理结果 →']].map(([id,label]) => <span key={id} style={{'--flow-color': flowColors[id]}}>{label}</span>)}
  </div>;
}
