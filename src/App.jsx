import { useCallback, Suspense, lazy, useEffect, useState } from 'react';
import Icon from './components/Icon.jsx';
import FlowLegend from './components/FlowLegend.jsx';
import SceneBoundary from './components/SceneBoundary.jsx';
import RoomHud from './components/RoomHud.jsx';
import useRoomTransition from './hooks/useRoomTransition.js';
import { systems, systemById } from './data/systems.js';

import useWorkflow from './hooks/useWorkflow.js';
import { requestWorkflow as workflow, internalStageForRequest, REQUEST_STAGE_DURATION } from './data/requestFlow.js';
import { rackParts } from './data/rackParts.js';
import { infraParts, infraDevices } from './data/infraParts.js';

const DataCenterViewport = lazy(() => import('./scene/DataCenterViewport.jsx'));
const ServerExperience = lazy(() => import('./components/ServerExperience.jsx'));

// One screen, one story: the room runs the request together with power and cold
// air, and any device you click opens its own innards. Every other view was
// removed on request, so the mode is a constant rather than state.
const MODE = 'workflow';
const LAYERS = { data: true, power: true, cooling: true, heat: true, storage: true, fire: true };
const VISIBLE = { network: true, compute: true, storage: true, backup: true, power: true, cooling: true, safety: true, monitoring: true };
const DEVICE_KINDS = ['network', 'compute', 'storage', 'backup'];
const INFRA_KINDS = { power: 'ups', cooling: 'crac' };
// Support-flow node ids that name a device standing in the room. Clicking the
// hardware itself has to behave exactly like clicking its callout, otherwise the
// device looks dead.
const SUPPORT_DEVICES = { ups: 'ups', distribution: 'distribution', feed: 'ups', busway: 'ups', crac: 'crac', vent: 'crac' };

function TeardownPanel({ parts, partId, rackId, onRack, onFocusPart, onCollapse, onDismiss, showRackPicker, devices, deviceId, onDevice, showServerEntry, onEnterServer, entryButton, entering, links, onToggleLinks }) {
  const count = parts.length;
  const part = parts.find((item) => item.id === partId) || null;
  return <>
    <div className="detail-heading teardown-heading" data-teardown-count={count}>
      <span>已拆解 <strong>{count} / {count}</strong></span>
      <div className="teardown-heading-actions">
        <button type="button" className="teardown-links" aria-pressed={links} onClick={onToggleLinks}>连接路径</button>
        <button type="button" className="teardown-all" onClick={onCollapse}>全部合上</button>
        <button type="button" className="panel-close" onClick={onDismiss} aria-label="收起说明"><Icon name="chevron" size={15} /></button>
      </div>
    </div>
    <div className="teardown-segments" aria-hidden="true">{parts.map((item) => <span key={item.id} className="on" />)}</div>
    <ol className="teardown-list" aria-label="机柜部件清单">
      {parts.map((item) => <li key={item.id}>
        <button type="button" data-part={item.id} aria-pressed={partId === item.id} onClick={() => onFocusPart(item.id)} aria-label={`${item.name}，${partId === item.id ? '查看中' : '已拆解'}`}>
          <span className="part-tag">{item.tag}</span>
          <span className="part-name">{item.shortName || item.name}</span>
          <span className="part-state">{partId === item.id ? '查看中' : '已拆解'}</span>
        </button>
      </li>)}
    </ol>
    <section className="teardown-spec" aria-live="polite" aria-label="部件规格">
      {part ? <>
        <div className="teardown-spec-heading"><span>规格卡</span><small>示例参数</small></div>
        <h3>{part.name}</h3>
        <dl>{Object.entries(part.specs).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
        <p className="teardown-role">{part.role}</p>
        <p className="teardown-spec-note">以上为教学示例参数，不代表真实产品规格。</p>
      </> : <p className="teardown-spec-empty">点选上方任一件查看规格。</p>}
    </section>
    {showRackPicker && <label className="rack-choice">计算机柜<select aria-label="选择计算机柜" value={rackId} onChange={(event) => onRack(event.target.value)}>{['C01', 'C02', 'C03', 'C04'].map((id) => <option key={id} value={id}>{id}</option>)}</select></label>}
    {devices && <label className="rack-choice">设备<select aria-label="选择设备" value={deviceId} onChange={(event) => onDevice(event.target.value)}>{devices.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
    {showServerEntry && <button type="button" className="structure-button teardown-enter" ref={entryButton} disabled={entering} onClick={onEnterServer}><Icon name="chip" size={17} />进入服务器内部</button>}
    <button type="button" className="structure-button teardown-close" onClick={onCollapse}><Icon name="expand" size={17} />合上内部构造</button>
    <p className="model-note">原理示意模型，连接关系经过简化；规格为示例参数。</p>
  </>;
}

function SystemPanel({ system, partCount, onClose, teardown, onToggleTeardown, canExpand, expanded, onToggleExpanded, showServerEntry, rackId, onRack, onEnterServer, entryButton, entering }) {
  return <>
    <div className="detail-heading">
      <span>已选择的设备</span>
      <button type="button" className="panel-close" onClick={onClose} aria-label="收起说明"><Icon name="chevron" size={15} /></button>
    </div>
    <div className="detail-title">
      <span className="detail-icon" style={{ '--system-color': system.color }}><Icon name={system.id} size={34} /></span>
      <h2>{system.name}</h2><p>{system.role}</p>
    </div>
    <div className="responsibilities">
      <section><span className="responsibility-icon"><Icon name="compute" size={19} /></span><div><h3>负责什么</h3><p>{system.description}</p></div></section>
      <section><span className="responsibility-icon"><Icon name="arrow" size={19} /></span><div><h3>接收什么</h3><p>{system.input}</p></div></section>
      <section><span className="responsibility-icon output-icon"><Icon name="arrow" size={19} /></span><div><h3>输出什么</h3><p>{system.output}</p></div></section>
    </div>
    <div className="relationships"><h3>与谁配合</h3><p>{system.partners}</p></div>
    {DEVICE_KINDS.includes(system.id) && <div className="teardown-entry">
      <button type="button" className="structure-button teardown-toggle" aria-pressed={teardown} onClick={onToggleTeardown}><Icon name="expand" size={17} />全部拆解</button>
      <p className="teardown-entry-progress">已拆解 <strong>0 / {partCount}</strong></p>
    </div>}
    {canExpand && <button type="button" className="structure-button" aria-pressed={expanded} onClick={onToggleExpanded}><Icon name="expand" size={17} />{expanded ? '收起内部结构' : '展开内部结构'}</button>}
    {showServerEntry && <div className="server-entry"><h3>继续认识服务器内部</h3><label className="rack-choice">计算机柜<select aria-label="选择计算机柜" value={rackId} onChange={(event) => onRack(event.target.value)}>{['C01', 'C02', 'C03', 'C04'].map((id) => <option key={id} value={id}>{id}</option>)}</select></label><p>{rackId} 计算机柜 · 01 号服务器<br />进入时暂停流程；返回保留阶段与进度。</p><button type="button" ref={entryButton} disabled={entering} onClick={onEnterServer}><Icon name="chip" size={18} />打开服务器内部<Icon name="chevron" size={15} /></button></div>}
    {expanded && <p className="structure-note">{system.structure}</p>}
    <p className="model-note">原理示意模型，连接关系经过简化。</p>
  </>;
}

export default function App() {
  const [selectedRack, setSelectedRack] = useState('C01');
  const [selected, setSelected] = useState(null);
  const flow = useWorkflow(workflow.length, REQUEST_STAGE_DURATION);
  const { step, playing } = flow;
  const [expanded, setExpanded] = useState(false);
  const [teardown, setTeardown] = useState(false);
  const [teardownPart, setTeardownPart] = useState(null);
  const [infraDevice, setInfraDevice] = useState('ups');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [layers, setLayers] = useState(LAYERS);
  const [visibleSystems, setVisibleSystems] = useState(VISIBLE);
  const [statusMode, setStatusMode] = useState('normal');
  const [quality, setQuality] = useState('high');
  const [bloomFx, setBloomFx] = useState(true);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [links, setLinks] = useState(true);
  const [focus, setFocus] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 901px)').matches);
  // Without WebGL the scene is replaced by a text fallback, so the device list
  // below keeps every detail reachable instead of leaving a dead page.
  const [roomFailed, setRoomFailed] = useState(false);
  const [internalStart, setInternalStart] = useState(0);
  const pauseAll = useCallback(() => { flow.pause(); }, [flow.pause]);
  const { phase, cameraRequest, roomCamera, entryButton, entryReady, entryError,
    onRoomError, onServerError, onServerLoadError, onServerReady, onRoomReady, onCameraComplete, onCameraInterrupt,
    moveCamera, cancelEntry, enterServer, returnToRoom } = useRoomTransition(selectedRack, pauseAll);
  const current = selected ? systemById[selected] : null;
  // Cabinets carry their own part tables; the power and cooling devices reuse the
  // same panel with a device picker (UPS / distribution, CRAC).
  const infraPick = selected && INFRA_KINDS[selected] ? (infraDevice || INFRA_KINDS[selected]) : null;
  const teardownParts = selected ? (rackParts[selected] ?? infraParts[infraPick] ?? []) : [];
  const infraTeardown = teardown && infraPick ? { device: infraPick, part: teardownPart, parts: infraParts[infraPick] } : null;
  const canExpand = !!current && !teardown && DEVICE_KINDS.includes(selected);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // Only the restore chip (or Escape) brings the interface back, so a stray click
  // on the stage never drops the viewer out of the clean view.
  useEffect(() => {
    if (!focus) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setFocus(false); }
      if (event.key === ' ') { event.preventDefault(); togglePlayback(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Narrowing the window removes the restore chip, so the interface must return
  // before it can be needed.
  useEffect(() => {
    const query = window.matchMedia('(min-width: 901px)');
    const onChange = () => { if (!query.matches) setFocus(false); };
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // The part list lives in the side panel, which the clean view hides. Picking a
  // device is a request for that detail, so it brings the interface back; a click
  // on empty stage still leaves the clean view alone.
  function revealDeviceDetails() {
    if (focus) setFocus(false);
  }
  // A power or cooling device opens the same way from a callout, from the device
  // picker and from a click on the cabinet itself. Re-clicking the one already
  // open is ignored so the camera does not restart for no reason.
  function openInfra(device) {
    const system = device === 'crac' ? 'cooling' : 'power';
    revealDeviceDetails();
    if (selected === system && teardown && infraDevice === device) return;
    cancelEntry();
    setSelected(system);
    setExpanded(false);
    setInfraDevice(device);
    setTeardown(true);
    setTeardownPart(infraParts[device][0].id);
    moveCamera(`teardown-${device}`);
  }
  // Clicking a cabinet is the only entrance to device detail: it opens the
  // exploded view, moves the camera in and freezes the running flow.
  function chooseSystem(id, rackId = null) {
    revealDeviceDetails();
    cancelEntry();
    setSelected(id);
    if (id === 'compute' && rackId) setSelectedRack(rackId);
    setExpanded(false);
    if (INFRA_KINDS[id]) { openInfra(INFRA_KINDS[id]); return; }
    const opens = DEVICE_KINDS.includes(id);
    if (!opens) { setTeardown(false); setTeardownPart(null); return; }
    const staysOpen = teardown && selected === id && (id !== 'compute' || !rackId || rackId === selectedRack);
    setTeardown(true);
    if (staysOpen) return;
    setTeardownPart(rackParts[id]?.[0]?.id ?? null);
    moveCamera(`teardown-${id}`);
  }
  // Closing the exploded view keeps the device selected so its description is one
  // click away again; dismissing the panel clears the selection entirely.
  function collapseTeardown() {
    setTeardown(false); setTeardownPart(null);
    moveCamera(selected || 'overview');
  }
  function closePanel() {
    setSelected(null); setTeardown(false); setTeardownPart(null); setExpanded(false);
    moveCamera('overview');
  }
  function chooseInfraDevice(id) {
    if (!infraDevices[selected]?.some((item) => item.id === id)) return;
    openInfra(id);
  }
  function toggleTeardown() {
    const next = !teardown;
    setTeardown(next);
    setTeardownPart(next ? (rackParts[selected]?.[0]?.id ?? null) : null);
    if (next) setExpanded(false);
    moveCamera(next ? `teardown-${selected}` : 'overview');
  }
  function focusTeardownPart(id) {
    const part = teardownParts.find((item) => item.id === id);
    cancelEntry();
    setTeardownPart(id);
    if (part) moveCamera(part.camera);
  }
  function togglePlayback() {
    cancelEntry();
    flow.toggle();
  }
  function chooseStep(index) {
    cancelEntry(); flow.chooseStep(index);
  }
  function openServer() {
    setInternalStart(internalStageForRequest(step));
    enterServer();
  }
  function toggleLayer(id) {
    setLayers((old) => ({ ...old, [id]: !old[id] }));
  }
  function toggleVisibleSystem(id) {
    setVisibleSystems((old) => ({ ...old, [id]: !old[id] }));
  }
  // Double-click is a camera-only shortcut: it keeps the device selected but asks
  // the rig for a closer front view instead of the exploded pose.
  function inspectRack(id) {
    cancelEntry();
    if (id.startsWith('C')) setSelectedRack(id);
    moveCamera('rack-close', { rackId: id });
  }
  function cameraAction(id) {
    if (id === 'overview') { cancelEntry(); moveCamera('overview'); return; }
    cancelEntry(false);
    moveCamera(id);
  }
  function pickStatus(mode) {
    setStatusMode(mode);
    if (mode === 'alarm') setLayers((old) => ({ ...old, fire: true }));
  }
  // Low quality drops the heat overlay with the rest of the expensive passes,
  // so the switch must not claim to be on while the map is absent.
  function pickQuality(id) {
    setQuality(id);
    if (id === 'low') { setHeatmap(false); setBloomFx(false); }
  }

  // The support layer and the hardware meshes share one click handler: a ray hit
  // on the UPS or a CRAC must open that device, not die in an empty callback.
  const support = {
    loop: true, playing, active: [], node: null, animate: playing,
    onSelectNode: (node) => { const device = SUPPORT_DEVICES[node]; if (device) openInfra(device); },
  };

  return <div className={`exhibit-stage phase-${phase}`}>
    {phase !== 'inside' && <main className={`app-shell room-shell collab-shell ${teardown ? 'teardown-mode' : ''} ${focus ? 'focus-mode' : ''} ${phase === 'returning' ? 'layer-preparing' : ''}`} inert={phase === 'returning' ? true : undefined}>
      <header className="app-header">
        <a className="brand" href="#main-content" aria-label="跳到工程展示"><span className="brand-mark"><Icon name="cube" size={26} /></span><span>数据中心<span className="brand-divider">/</span><span className="brand-subtitle">协作可视化</span></span></a>
        <div className="header-meta">
          <span className="architecture-tag"><span />示例架构</span>
          <button type="button" className="focus-toggle" onClick={() => setFocus(true)}><Icon name="expand" size={15} />纯净视野</button>
        </div>
      </header>

      <div className="workspace-grid room-grid" id="main-content">
        <RoomHud playing={playing} reducedMotion={reducedMotion} step={step} workflowLength={workflow.length}
          layers={layers} onToggleLayer={toggleLayer}
          visibleSystems={visibleSystems} onToggleSystem={toggleVisibleSystem}
          statusMode={statusMode} onStatusMode={pickStatus}
          quality={quality} onQuality={pickQuality}
          bloomFx={bloomFx} onBloomFx={() => setBloomFx((old) => !old)}
          autoOrbit={autoOrbit} onAutoOrbit={() => setAutoOrbit((old) => !old)}
          heatmap={heatmap} onHeatmap={() => setHeatmap((old) => !old)}
          links={links} onLinks={() => setLinks((old) => !old)} hasSelection={!!current}
          onCamera={cameraAction} />
        {focus && <button type="button" className="focus-restore" aria-label="显示界面" title="显示界面（Esc）" onClick={() => setFocus(false)}><Icon name="layers" size={16} /><span>显示界面</span></button>}

        <section className="center-column" aria-label="三维机房">
          <div className="scene-card">
            <div className="viewport-wrap">
              <div className="scene-vignette" aria-hidden="true" />
              <div className="viewport" data-testid="viewport" data-quality={quality} data-status={statusMode} data-heatmap={heatmap ? 'true' : 'false'}>
                <SceneBoundary onError={(error) => { setRoomFailed(true); onRoomError(error); }}><Suspense fallback={<div className="scene-loading"><span className="loading-cube"><Icon name="cube" size={34} /></span><p>正在展开机房结构…</p></div>}><DataCenterViewport selected={selected} selectedRack={selectedRack} cameraSnapshot={roomCamera} onSelect={chooseSystem} onInspectRack={inspectRack} mode={MODE} expanded={expanded} teardown={teardown} teardownPart={teardownPart} infraTeardown={infraTeardown} layers={layers} step={step} playing={playing} clock={flow.clock} revision={flow.revision} selectedNode={null} reducedMotion={reducedMotion} cameraRequest={cameraRequest} onCameraComplete={onCameraComplete} onCameraInterrupt={onCameraInterrupt} onReady={onRoomReady} onSelectDevice={openInfra} support={support} quality={quality} bloomFx={bloomFx} statusMode={statusMode} visibleSystems={visibleSystems} heatmap={heatmap} links={links} autoOrbit={autoOrbit} /></Suspense></SceneBoundary>
                <div className="scene-controls"><button type="button" aria-label="复位视角" title="复位视角" onClick={() => { cancelEntry(); moveCamera('overview'); }}><Icon name="reset" size={17} />复位</button><div className="camera-tools" role="group" aria-label="机房视角操作">{[{ id: 'left', label: '向左旋转机房', text: '左转' }, { id: 'right', label: '向右旋转机房', text: '右转' }, { id: 'in', label: '放大机房', text: '放大' }, { id: 'out', label: '缩小机房', text: '缩小' }].map(action => <button type="button" key={action.id} aria-label={action.label} onClick={() => { cancelEntry(false); moveCamera(action.id); }}>{action.text}</button>)}</div></div>
              </div>
              {roomFailed && <nav className="fallback-systems" aria-label="系统列表">{systems.map((system) => <button type="button" key={system.id} aria-label={`查看${system.name}的工作`} onClick={() => chooseSystem(system.id)}><span className="flow-swatch" style={{ '--flow-color': system.color }} />{system.name}<small>{system.caption}</small></button>)}</nav>}
            </div>
          </div>
        </section>

        {current && <aside className={`detail-panel room-detail ${teardown && teardownParts.length ? 'teardown-panel' : ''}`} id="system-details" aria-label="设备细节">
          {teardown && teardownParts.length
            ? <TeardownPanel parts={teardownParts} partId={teardownPart} rackId={selectedRack} onRack={(id) => { cancelEntry(); setSelectedRack(id); }} onFocusPart={focusTeardownPart} onCollapse={collapseTeardown} onDismiss={closePanel} showRackPicker={selected === 'compute'} devices={infraDevices[selected]} deviceId={infraPick} onDevice={chooseInfraDevice} showServerEntry={selected === 'compute'} onEnterServer={openServer} entryButton={entryButton} entering={phase === 'entering'} links={links} onToggleLinks={() => setLinks((old) => !old)} />
            : <SystemPanel system={current} onClose={closePanel} teardown={teardown} onToggleTeardown={toggleTeardown} onDismiss={closePanel} partCount={teardownParts.length} canExpand={canExpand} showServerEntry={selected === 'compute'} rackId={selectedRack} onRack={(id) => { cancelEntry(); setSelectedRack(id); }} onEnterServer={openServer} entryButton={entryButton} entering={phase === 'entering'} expanded={expanded} onToggleExpanded={() => setExpanded((old) => !old)} />}
        </aside>}
      </div>

      <section className="collab-bar" aria-label="协作流程控制">
        <button type="button" className="play-button" onClick={togglePlayback} aria-pressed={playing} aria-label={playing ? '停止演示' : '播放演示'}><Icon name={playing ? 'pause' : 'play'} size={16} />{playing ? '停止' : '播放'}</button>
        <div className="collab-progress" role="group" aria-label="协作流程进度">{workflow.map((item, index) => <button type="button" key={item.title} className={`collab-segment ${index === step ? 'current' : ''} ${index < step ? 'done' : ''}`} aria-label={`第 ${index + 1} 步：${item.title}`} aria-current={index === step ? 'step' : undefined} onClick={() => chooseStep(index)} />)}</div>
        <p className="collab-status" aria-live="polite"><strong>{step + 1} / {workflow.length}</strong><span>{workflow[step].title}</span>{teardown && <em>{playing ? '拆解中 · 演示继续' : '拆解中'}</em>}</p>
        <FlowLegend />
      </section>
      {phase === 'entering' && <div className="entry-status" role="status"><span>{entryError || (!entryReady ? `正在靠近 ${selectedRack} 并准备服务器内部…` : '内部已就绪，正在衔接视角…')}</span><button type="button" onClick={() => cancelEntry()}>取消进入</button></div>}
    </main>}
    {phase !== 'room' && <div className={phase === 'entering' ? 'server-layer layer-preparing' : 'server-layer'} inert={phase === 'entering' ? true : undefined}>
      <SceneBoundary onError={onServerLoadError}><Suspense fallback={null}><ServerExperience initialStep={internalStart} roomStep={step + 1} rackId={selectedRack} onBack={returnToRoom} reducedMotion={reducedMotion} onReady={onServerReady} onSceneError={onServerError} active={phase === 'inside'} /></Suspense></SceneBoundary>
    </div>}
  </div>;
}
