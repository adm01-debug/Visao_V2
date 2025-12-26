/**
 * ML Service
 * Machine Learning with TensorFlow.js
 */

export interface DetectionResult {
  class: string;
  score: number;
  bbox?: [number, number, number, number];
}

class MLService {
  private models: Map<string, any> = new Map();
  private isLoaded = false;

  async loadModel(name: string, modelUrl: string): Promise<void> {
    // Dynamic import for TensorFlow
    const tf = await import('@tensorflow/tfjs');
    const model = await tf.loadLayersModel(modelUrl);
    this.models.set(name, model);
  }

  async predict(modelName: string, input: number[] | Float32Array): Promise<number[]> {
    const tf = await import('@tensorflow/tfjs');
    const model = this.models.get(modelName);
    if (!model) throw new Error(`Model ${modelName} not loaded`);
    const tensor = tf.tensor(input);
    const prediction = model.predict(tensor) as any;
    const result = await prediction.array();
    tensor.dispose();
    prediction.dispose();
    return result.flat();
  }

  async classifyImage(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<DetectionResult[]> {
    const mobilenet = await import('@tensorflow-models/mobilenet');
    const model = await mobilenet.load();
    const predictions = await model.classify(imageElement);
    return predictions.map(p => ({ class: p.className, score: p.probability }));
  }

  async detectObjects(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<DetectionResult[]> {
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    const model = await cocoSsd.load();
    const predictions = await model.detect(imageElement);
    return predictions.map(p => ({
      class: p.class,
      score: p.score,
      bbox: p.bbox as [number, number, number, number],
    }));
  }

  async detectFaces(imageElement: HTMLImageElement | HTMLCanvasElement): Promise<DetectionResult[]> {
    const blazeface = await import('@tensorflow-models/blazeface');
    const model = await blazeface.load();
    const predictions = await model.estimateFaces(imageElement, false);
    return predictions.map((p: any) => ({
      class: 'face',
      score: p.probability?.[0] || 1,
      bbox: [p.topLeft[0], p.topLeft[1], p.bottomRight[0] - p.topLeft[0], p.bottomRight[1] - p.topLeft[1]],
    }));
  }

  dispose(): void {
    this.models.forEach(model => model.dispose?.());
    this.models.clear();
  }
}

export const mlService = new MLService();
export default mlService;
