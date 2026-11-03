import { serverWorkflow, STAGE_DURATION } from '../data/server.js';
import useWorkflow from './useWorkflow.js';
export default function useServerWorkflow(initialStep = 0) {
  return useWorkflow(serverWorkflow.length, STAGE_DURATION, initialStep);
}
