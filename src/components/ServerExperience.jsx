import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import FlowLegend from './FlowLegend.jsx';
import SceneBoundary from './SceneBoundary.jsx';
import { partById, serverParts, serverWorkflow, STAGE_DURATION } from '../data/server.js';
import useServerWorkflow from '../hooks/useServerWorkflow.js';

const ServerViewport = lazy(() => import('../scene/ServerViewport.jsx'));

export default function ServerExperience({ rackId, onBack, reducedMotion, onReady, onSceneError, active = true, initialStep = 0, roomStep = null }) {
  const [selected, setSelected] = useState('cpu');
  const [expanded, setExpanded] = useState(false);
  const [cameraAction, setCameraAction] = useState({ type: 'reset', token: 0 });
  const flow = useServerWorkflow(initialStep);
  const heading = useRef();
  const part = partById[selected];
  const stage = serverWorkflow[flow.step];
  useEffect(() => { if (active) heading.current.focus(); }, [active]);
  function chooseStep(index) { flow.chooseStep(index); setSelected(serverWorkflow[index].focus); }
  function camera(type) { setCameraAction((old) => ({ type, token: old.token + 1 })); }
  return <main className="app-shell server-shell">
    <header className="app-header server-header">
      <a className="brand" href="#server-content"><span className="brand-mark"><Icon name="cube" size={26} /></span><span>数据中心<span className="brand-divider">/</span><span className="brand-subtitle">服务器内部</span></span></a>
      <span className="server-breadcrumb">计算机柜 {rackId} <Icon name="chevron" size={14} />01 号服务器</span>
      <button type="button" className="back-button" onClick={onBack}><Icon name="return" size={17} />返回机房</button>
    </header>
    <div className="workspace-grid server-grid" id="server-content">
      <aside className="system-sidebar part-sidebar" aria-label="服务器部件列表">
        <div className="sidebar-heading"><Icon name="layers" size={16} /><h2>服务器部件</h2><span>6</span></div>
        <div className="system-list">{serverParts.map((item) => <button type="button" key={item.id} aria-label={`${item.name} ${item.subtitle}`} className={`system-button ${selected === item.id ? 'selected' : ''}`} aria-pressed={selected === item.id} onClick={() => setSelected(item.id)} style={{ '--system-color': '#2468df' }}><span className="system-icon"><Icon name={item.icon} size={21} /></span><span><strong>{item.name}</strong><small>{item.subtitle}</small></span>{selected === item.id && <Icon name="check" size={15} className="system-chevron" />}</button>)}</div>
        <div className="sidebar-note"><Icon name="info" size={17} /><p>点击模型或文字列表都能选择部件。蓝框表示已选中，描边与“参与本步”标记表示正在协作。</p></div>
        <div className="architecture-key"><span>持续支撑</span><strong>电源供电 ＋ 风扇散热</strong><p>它们在五个阶段中持续工作，不作为数据流中的先后步骤。</p></div>
      </aside>

      <section className="center-column" aria-label="服务器结构和处理过程">
        <div className="scene-card">
          <div className="scene-heading"><div><span className="section-kicker">计算机柜 {rackId} / 01 号服务器</span><h1 ref={heading} tabIndex={-1}>打开服务器，看一份文件如何被处理。</h1></div><span className="scene-count">教学剖视</span></div>
          <div className="viewport server-viewport" data-testid="server-viewport">
            <SceneBoundary onError={onSceneError}><Suspense fallback={<div className="scene-loading" role="status"><Icon name="cube" size={34} /><p>正在准备服务器内部视图…</p></div>}><ServerViewport selected={selected} onSelect={setSelected} expanded={expanded} step={flow.step} playing={flow.playing} clock={flow.clock} revision={flow.revision} reducedMotion={reducedMotion} cameraAction={cameraAction} onReady={onReady} /></Suspense></SceneBoundary>
            <div className="scene-caption"><span className="caption-dot" />{expanded ? '展开视图 · 部件分离便于观察' : '完整视图 · 顶盖已隐藏'}</div>
            <div className="scene-controls"><span>拖动旋转 · 滚轮缩放</span><button type="button" onClick={() => camera('reset')}><Icon name="reset" size={16} />视角复位</button></div>
          </div>
          <div className="server-tools">
            <div className="view-switch" role="group" aria-label="模型展示方式"><button type="button" aria-pressed={!expanded} onClick={() => setExpanded(false)}>完整视图</button><button type="button" aria-pressed={expanded} onClick={() => setExpanded(true)}><Icon name="expand" size={15} />展开视图</button></div>
            <div className="camera-tools" role="group" aria-label="视角操作"><button type="button" aria-label="向左旋转视角" title="向左旋转" onClick={() => camera('left')}>↶</button><button type="button" aria-label="向右旋转视角" title="向右旋转" onClick={() => camera('right')}>↷</button><button type="button" aria-label="放大模型" onClick={() => camera('in')}>＋</button><button type="button" aria-label="缩小模型" onClick={() => camera('out')}>−</button></div>
          </div>
          <p className="server-scene-note">{roomStep && `机房停在第 ${roomStep} 步；${rackId !== 'C01' ? '业务示例固定运行于 C01，当前机柜展示相同教学结构。' : ''}内部从对应原理阶段开始，独立查看，返回后可继续机房流程。`}箭头表示本步的数据方向；电源与风扇持续支撑。{reducedMotion && '已遵循减少动态效果偏好，移动标记保持静止。'}</p>
        </div>

        <section className="workflow-card server-workflow" aria-labelledby="server-workflow-title">
          <div className="workflow-heading"><div><h2 id="server-workflow-title">读取并处理一份文件</h2><p aria-live="polite">第 {flow.step + 1} / 5 步 · {flow.playing ? '正在播放' : flow.clock.current.elapsed >= STAGE_DURATION ? '演示结束' : '已暂停，可逐步查看'}</p></div><div className="playback-tools"><button type="button" className="restart-button" onClick={() => { flow.restart(); setSelected('nic'); }}><Icon name="reset" size={16} />重新开始</button><button type="button" className="play-button" aria-pressed={flow.playing} onClick={flow.toggle}><Icon name={flow.playing ? 'pause' : 'play'} size={16} />{flow.playing ? '暂停' : flow.clock.current.elapsed >= STAGE_DURATION ? '重新播放' : '播放'}</button></div></div>
          <ol className="workflow-steps">{serverWorkflow.map((item,index) => <li key={item.title}><button type="button" aria-label={`第 ${index + 1} 步：${item.title}`} aria-current={index === flow.step ? 'step' : undefined} className={`step-button ${index === flow.step ? 'current' : ''} ${index < flow.step ? 'completed' : ''}`} onClick={() => chooseStep(index)}><span className="step-number">{index + 1}</span><span>{item.short}</span></button>{index < 4 && <Icon name="arrow" className="step-arrow" size={14} />}</li>)}</ol>
          <FlowLegend />
          <div className="workflow-explanation" aria-live="polite" aria-atomic="true"><span className="stage-index">{flow.step + 1}</span><div><strong>{stage.title}</strong><p>{stage.text}</p></div></div>
        </section>
        <p className="logic-note"><Icon name="info" size={15} />这是简化的逻辑流程，不模拟真实指令执行、操作系统调度或电路信号。</p>
      </section>

      <aside className="detail-panel server-detail" aria-label="部件工作说明" aria-live="polite" aria-atomic="true">
        <div className="detail-heading"><span>已选择的部件</span><span className="selection-check"><Icon name="check" size={14} />已选中</span></div>
        <div className="detail-title"><span className="detail-icon" style={{ '--system-color': '#2468df' }}><Icon name={part.icon} size={34} /></span><h2>{part.name}</h2><p>{part.subtitle}</p></div>
        <div className="responsibilities"><section><span className="responsibility-icon"><Icon name={part.icon} size={19} /></span><div><h3>负责什么</h3><p>{part.responsibility}</p></div></section><section><span className="responsibility-icon"><Icon name="layers" size={19} /></span><div><h3>与哪些部件配合</h3><p>{part.partners}</p></div></section></div>
        <section className="current-role"><span>第 {flow.step + 1} 步 · {stage.title}</span><h3>当前承担什么工作</h3><p>{part.stages[flow.step]}</p>{['psu','fans'].includes(part.id) && <strong>五个阶段持续提供支撑</strong>}</section>
        <p className="model-note">部件形状和连接经过教学简化。展开视图中的距离不代表真实安装位置。</p>
      </aside>
    </div>
    <footer className="app-footer"><span><span className="footer-dot" />认识部件 · 看见协作</span><span>原创 Blender 模型 · 无外部素材</span></footer>
  </main>;
}
