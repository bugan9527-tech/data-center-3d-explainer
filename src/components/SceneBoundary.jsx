import { Component } from 'react';
import Icon from './Icon.jsx';

export default class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { this.props.onError?.(error); }
  render() {
    return this.state.failed ? <div className="scene-fallback" role="status"><Icon name="cube" size={40} /><h2>三维视图暂时无法显示</h2><p>请启用浏览器硬件加速后刷新。仍可通过文字列表选择部件、阅读说明和操作流程步骤。</p></div> : this.props.children;
  }
}
