import { useCallback, useEffect, useRef, useState } from 'react';

// Retain the visible scene until the destination has drawn. Only the two brief
// handoffs overlap canvases; the inactive layer is inert and never interactive.
export default function useRoomTransition(rackId, pauseRoom) {
  const [phase, setPhase] = useState('room');
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const [cameraRequest, setCameraRequest] = useState({ id:'overview', token:0 });
  const [entryReady, setEntryReady] = useState(false);
  const [approached, setApproached] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const [roomFailed, setRoomFailed] = useState(false);
  const [entryError, setEntryError] = useState('');
  const roomCamera = useRef(null);
  const returnCamera = useRef(null);
  const entryToken = useRef(null);
  const requestToken = useRef(0);
  const roomScroll = useRef(0);
  const entryButton = useRef();
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (phase === 'entering' && entryReady && approached) setPhase('inside');
  }, [phase, entryReady, approached]);
  useEffect(() => {
    if (phase === 'returning' && roomReady) setPhase('room');
    if (phase === 'room' && restoreFocus.current) {
      restoreFocus.current = false;
      const frame = requestAnimationFrame(() => {
        window.scrollTo(0,roomScroll.current);
        (entryButton.current || document.querySelector('.room-shell .panel-toggle'))?.focus({ preventScroll:true });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [phase, roomReady]);
  const onRoomError = useCallback(() => { setRoomFailed(true); setRoomReady(true); setApproached(true); }, []);
  const onServerError = useCallback(() => { setEntryError('三维资源未能加载，将提供文字讲解。'); setEntryReady(true); }, []);
  const onServerLoadError = useCallback(() => { setEntryError('内部界面未能加载，请取消进入并刷新页面重试。'); }, []);
  const onServerReady = useCallback(() => setEntryReady(true), []);
  const onRoomReady = useCallback(() => setRoomReady(true), []);
  const onCameraComplete = useCallback(token => { if (token === entryToken.current) setApproached(true); }, []);
  const onCameraInterrupt = useCallback(token => {
    if (token === entryToken.current && phaseRef.current === 'entering') {
      entryToken.current = null; setPhase('room');
    }
  }, []);

  function nextToken() {
    requestToken.current += 1;
    return requestToken.current;
  }
  function moveCamera(id, extra = {}) {
    const token = nextToken();
    setCameraRequest({ id, token, ...extra });
    return token;
  }
  function holdCamera() {
    const token = nextToken();
    setCameraRequest({ id: 'hold', token });
    return token;
  }
  function cancelEntry(restore = true) {
    if (phaseRef.current !== 'entering') return;
    entryToken.current = null; setPhase('room');
    if (restore && returnCamera.current) moveCamera('restore',{ pose:returnCamera.current, instant:true });
  }
  function enterServer() {
    if (phase !== 'room') return;
    roomScroll.current = window.scrollY;
    returnCamera.current = roomCamera.current ? structuredClone(roomCamera.current) : null;
    setEntryReady(false); setApproached(roomFailed); setEntryError('');
    pauseRoom(); setPhase('entering');
    const token = nextToken();
    entryToken.current = token;
    setCameraRequest({ id: 'entry', rackId, token });
  }
  function returnToRoom() {
    if (phase === 'entering') { cancelEntry(); return; }
    roomCamera.current = returnCamera.current;
    restoreFocus.current = true; setRoomReady(false); setPhase('returning');
  }
  return { phase, cameraRequest, roomCamera, entryButton, entryReady, entryError,
    onRoomError, onServerError, onServerLoadError, onServerReady, onRoomReady, onCameraComplete, onCameraInterrupt,
    moveCamera, holdCamera, cancelEntry, enterServer, returnToRoom };
}
