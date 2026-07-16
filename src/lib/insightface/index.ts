/**
 * VISÃO - InsightFace public exports.
 */
export * from './types';
export * from './similarity';
export { insightFaceClient } from './client';
export { runInsightFacePipeline } from './pipeline';
export type { PipelineOptions, PipelineResult } from './pipeline';
export { useInsightFace } from './useInsightFace';
