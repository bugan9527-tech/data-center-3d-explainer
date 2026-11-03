import { useEffect, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import {
  flowLayerDefs, qualityOrder, qualityPresets, sparkPath, statusLabels,
  statusOrder, systemVisibilityDefs, twinMetrics, twinTrend,
} from '../data/twinData.js';

function useHudMetrics(playing, reducedMotion, statusMode) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!playing || reducedMotion) return undefined;
    const timer = setInterval(() => setTick((value) => value + 1), 1600);
    return () => clearInterval(timer);
  }, [playing, reducedMotion]);
  const metrics = useMemo(() => twinMetrics(statusMode, tick), [statusMode, tick]);
  return { ...metrics, tick };
}

function useFullscreen() {
  const [active, setActive] = useState(() => !!document.fullscreenElement);
  useEffect(() => {
    const sync = () => setActive(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggle = () => {
    const pending = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    if (pending && pending.catch) pending.catch(() => {});
  };
  return { supported: !!document.fullscreenEnabled, active, toggle };
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return {
    time: now.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    date: now.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', weekday: 'short' }),
  };
}

function Sparkline({ values }) {
  const path = sparkPath(values);
  return <svg className="hud-sparkline" viewBox="0 0 132 38" aria-hidden="true">
    <defs>
      <linearGradient id="hud-spark-fill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#22d3ee" stopOpacity=".34" />
        <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
      </linearGradient>
    </defs>
    <path d={`${path} L132 38 L0 38 Z`} fill="url(#hud-spark-fill)" />
    <path d={path} fill="none" stroke="#67e8f9" strokeWidth="1.4" strokeLinecap="round" />
  </svg>;
}

export default function RoomHud({
  playing, reducedMotion, step, workflowLength,
  layers, onToggleLayer, visibleSystems, onToggleSystem,
  statusMode, onStatusMode, quality, onQuality,
  bloomFx, onBloomFx, autoOrbit, onAutoOrbit, heatmap, onHeatmap, links, onLinks, hasSelection,
  onCamera,
}) {
  const metrics = useHudMetrics(playing, reducedMotion, statusMode);
  const clock = useClock();
  const fullscreen = useFullscreen();
  const cpuTrend = useMemo(() => twinTrend(statusMode, metrics.tick, 'cpu'), [statusMode, metrics.tick]);
  const netTrend = useMemo(() => twinTrend(statusMode, metrics.tick, 'throughput', 16), [statusMode, metrics.tick]);
  const alerts = metrics.alerts;
  const normalQuality = qualityPresets[quality] ?? qualityPresets.high;
  return <div className="hud-layer">
    <header className="hud-top" aria-label="数据中心运行总览">
      <div className="hud-brand">
        <span className="hud-logo"><Icon name="cube" size={22} /></span>
        <div>
          <strong>数据中心 · 数字孪生</strong>
          <span>DATA CENTER DIGITAL TWIN / 教学示例</span>
        </div>
      </div>
      <div className="hud-top-status">
        <span className={`hud-status-pill hud-status-${statusMode}`}><i />{statusLabels[statusMode]}</span>
        <span className="hud-top-chip hud-top-alert">告警 <b>{alerts.length}</b></span>
        <span className="hud-top-chip hud-top-flow">流程 <b>{step + 1}</b> / {workflowLength}</span>
        <span className="hud-top-chip sim">模拟数据</span>
      </div>
      <div className="hud-top-right">
        <span className="hud-date">{clock.date}</span>
        <strong className="hud-clock">{clock.time}</strong>
        {fullscreen.supported && <button type="button" className={`hud-fullscreen ${fullscreen.active ? 'is-on' : ''}`} aria-pressed={fullscreen.active} aria-label={fullscreen.active ? '退出全屏' : '进入全屏'} title={fullscreen.active ? '退出全屏' : '进入全屏'} onClick={fullscreen.toggle}><Icon name={fullscreen.active ? 'compress' : 'expand'} size={13} /></button>}
      </div>
    </header>

    <aside className="hud-left" aria-label="运行概览">
      <div className="hud-panel-head"><h2>运行概览</h2><span className="sim-mark">模拟</span></div>
      <div className="hud-kpis">
        <div className="hud-kpi">
          <small>机柜与动力设备</small>
          <strong>{metrics.total}<em>台</em></strong>
          <span className="hud-kpi-foot">在线 {metrics.online} 台 · 不含消防安防末端</span>
        </div>
        <div className="hud-kpi">
          <small>设备在线率</small>
          <strong>{metrics.onlineRate.toFixed(1)}<em>%</em></strong>
          <span className={`hud-kpi-foot ${metrics.onlineRate < 90 ? 'is-warn' : 'is-ok'}`}>{metrics.onlineRate < 90 ? '存在离线设备' : '全部在线'}</span>
        </div>
        <div className="hud-kpi">
          <small>CPU 平均使用率</small>
          <strong>{metrics.cpu}<em>%</em></strong>
          <span className="hud-kpi-foot">模拟负载</span>
        </div>
        <div className="hud-kpi">
          <small>内存使用率</small>
          <strong>{metrics.memory}<em>%</em></strong>
          <span className="hud-kpi-foot">模拟占用</span>
        </div>
      </div>
      <div className="hud-throughput">
        <div>
          <small>网络吞吐量</small>
          <strong>{metrics.throughput.toFixed(2)}<em>Gbps</em></strong>
        </div>
        <div className="hud-bars" aria-hidden="true">
          {netTrend.map((value, index) => <span key={index} style={{ height: `${Math.max(12, Math.min(100, value * 2))}%` }} />)}
        </div>
      </div>
      <div className="hud-spark">
        <div className="hud-spark-head"><span>CPU 负载趋势</span><b>{metrics.cpu}%</b></div>
        <Sparkline values={cpuTrend} />
      </div>

      <section className="hud-block">
        <div className="hud-section"><span>动态数据流</span><em>独立开关</em></div>
        <div className="hud-toggles">
          {flowLayerDefs.map((item) => <button key={item.id} type="button" className={`hud-toggle ${layers[item.id] ? 'is-on' : ''}`} style={{ '--dot': item.color }} aria-pressed={!!layers[item.id]} aria-label={`${layers[item.id] ? '关闭' : '开启'}${item.label}流向`} onClick={() => onToggleLayer(item.id)}><i />{item.label}</button>)}
        </div>
      </section>

      <section className="hud-block">
        <div className="hud-section"><span>设备显示</span><em>类别</em></div>
        <div className="hud-systems">
          {systemVisibilityDefs.map((item) => <button key={item.id} type="button" className={`hud-system ${visibleSystems[item.id] !== false ? 'is-on' : ''}`} style={{ '--dot': item.color }} aria-pressed={visibleSystems[item.id] !== false} aria-label={`${visibleSystems[item.id] !== false ? '隐藏' : '显示'}${item.label}设备`} onClick={() => onToggleSystem(item.id)}>{item.label}</button>)}
        </div>
      </section>

      <section className="hud-block hud-camera-block">
        <div className="hud-section"><span>视角控制</span><em>平滑过渡</em></div>
        <div className="hud-camera">
          <button type="button" onClick={() => onCamera('overview')} aria-label="回到总览视角"><Icon name="reset" size={13} />总览</button>
          <button type="button" onClick={() => onCamera('left')} aria-label="向左环绕机房">↶</button>
          <button type="button" onClick={() => onCamera('right')} aria-label="向右环绕机房">↷</button>
          <button type="button" onClick={() => onCamera('in')} aria-label="放大机房">＋</button>
          <button type="button" onClick={() => onCamera('out')} aria-label="缩小机房">−</button>
          <button type="button" className={autoOrbit ? 'is-on' : ''} aria-pressed={autoOrbit} onClick={onAutoOrbit} aria-label={autoOrbit ? '关闭自动环绕' : '开启自动环绕'}>环绕</button>
        </div>
      </section>
      <p className="hud-sim-note">无实时接口，以上指标为教学模拟数据。</p>
    </aside>

    <aside className="hud-right" aria-label="环境与告警">
      <div className="hud-panel-head"><h2>环境与能源</h2><span className="sim-mark">模拟</span></div>
      <div className="hud-env">
        <div className="hud-env-cell">
          <small>机房平均温度</small>
          <strong>{metrics.temperature.toFixed(1)}<em>°C</em></strong>
          <span>{metrics.temperature > 26 ? '高于建议区间' : '处于建议区间'}</span>
        </div>
        <div className="hud-env-cell">
          <small>当前总功率</small>
          <strong>{metrics.power.toFixed(1)}<em>kW</em></strong>
          <span>模拟负载合计</span>
        </div>
      </div>
      <div className="hud-facilities">
        <div>
          <small>UPS 运行状态</small>
          <strong className={metrics.ups === '在线' ? 'ok' : 'warn'}><i />{metrics.ups}</strong>
          <span>{metrics.upsNote}</span>
        </div>
        <div>
          <small>冷却系统</small>
          <strong className={metrics.cooling === '运行' ? 'ok' : 'warn'}><i />{metrics.cooling}</strong>
          <span>{metrics.coolingNote}</span>
        </div>
      </div>

      <section className="hud-block">
        <div className="hud-section"><span>实时告警</span><em>{alerts.length} 条</em></div>
        {alerts.length === 0
          ? <div className="hud-alarm-empty"><i />当前无活动告警<small>模拟</small></div>
          : <div className="hud-alarms">{alerts.map((alert) => <div key={alert.title} className={`hud-alarm hud-alarm-${alert.level}`}><strong>{alert.title}</strong><span>{alert.note}</span></div>)}</div>}
      </section>

      <section className="hud-block">
        <div className="hud-section"><span>状态演示</span><em>教学</em></div>
        <div className="hud-seg" role="group" aria-label="运行状态演示">
          {statusOrder.map((id) => <button key={id} type="button" aria-pressed={statusMode === id} onClick={() => onStatusMode(id)} className={`hud-seg-${id}`}>{statusLabels[id]}</button>)}
        </div>
        <p className="hud-hint">故障与告警只改变局部提示，不修改设备位置或流程。</p>
      </section>

      <section className="hud-block">
        <div className="hud-section"><span>叠加显示</span><em>可选</em></div>
        <div className="hud-switch-row">
          <span>冷通道热力图</span>
          <button type="button" className="hud-switch" aria-pressed={heatmap} disabled={quality === 'low'} aria-label="冷通道热力图开关" onClick={onHeatmap}><i /><b>{heatmap ? '开' : '关'}</b></button>
        </div>
        <div className="hud-switch-row">
          <span>设备连接路径</span>
          <button type="button" className="hud-switch" aria-pressed={links} disabled={!hasSelection} aria-label="设备连接路径开关" onClick={onLinks}><i /><b>{links ? '开' : '关'}</b></button>
        </div>
        {heatmap && <div className="hud-heat-legend" aria-label="热力图色标">
          <span>冷</span><div className="hud-heat-bar" /><span>热</span><small>示意 · 非实测</small>
        </div>}
      </section>

      <section className="hud-block">
        <div className="hud-section"><span>渲染画质</span><em>{normalQuality.label}档</em></div>
        <div className="hud-seg hud-quality">
          {qualityOrder.map((id) => <button key={id} type="button" aria-pressed={quality === id} onClick={() => onQuality(id)}>{qualityPresets[id].label}</button>)}
        </div>
        <div className="hud-switch-row">
          <span>Bloom 泛光</span>
          <button type="button" className="hud-switch" aria-pressed={!!bloomFx} disabled={!normalQuality.bloom} aria-label="Bloom 泛光开关" onClick={onBloomFx}><i /><b>{bloomFx ? '开' : '关'}</b></button>
        </div>
        <p className="hud-hint">低画质关闭 Bloom 与阴影，保留路径与标签。</p>
      </section>
      <p className="hud-sim-note">所有读数均为模拟值，用于演示数字孪生界面。</p>
    </aside>
  </div>;
}
