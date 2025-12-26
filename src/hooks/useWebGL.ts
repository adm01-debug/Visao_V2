/**
 * useWebGL Hook
 * WebGL context management
 */

import { useRef, useEffect, useCallback, useState } from 'react';

export interface UseWebGLOptions {
  antialias?: boolean;
  alpha?: boolean;
  depth?: boolean;
  stencil?: boolean;
  preserveDrawingBuffer?: boolean;
}

export interface UseWebGLReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  gl: WebGLRenderingContext | WebGL2RenderingContext | null;
  isSupported: boolean;
  isWebGL2: boolean;
  createShader: (type: number, source: string) => WebGLShader | null;
  createProgram: (vertexShader: WebGLShader, fragmentShader: WebGLShader) => WebGLProgram | null;
  clear: (color?: [number, number, number, number]) => void;
  resize: () => void;
}

export function useWebGL(options: UseWebGLOptions = {}): UseWebGLReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gl, setGl] = useState<WebGLRenderingContext | WebGL2RenderingContext | null>(null);
  const [isWebGL2, setIsWebGL2] = useState(false);

  const isSupported = typeof WebGLRenderingContext !== 'undefined';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isSupported) return;

    const contextOptions: WebGLContextAttributes = {
      antialias: options.antialias ?? true,
      alpha: options.alpha ?? true,
      depth: options.depth ?? true,
      stencil: options.stencil ?? false,
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
    };

    let context = canvas.getContext('webgl2', contextOptions) as WebGL2RenderingContext | null;
    if (context) {
      setIsWebGL2(true);
    } else {
      context = canvas.getContext('webgl', contextOptions) as WebGLRenderingContext | null;
      setIsWebGL2(false);
    }

    setGl(context);

    return () => {
      if (context) {
        const ext = context.getExtension('WEBGL_lose_context');
        ext?.loseContext();
      }
    };
  }, [isSupported, options.antialias, options.alpha, options.depth, options.stencil, options.preserveDrawingBuffer]);

  const createShader = useCallback((type: number, source: string): WebGLShader | null => {
    if (!gl) return null;

    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }, [gl]);

  const createProgram = useCallback((
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram | null => {
    if (!gl) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }, [gl]);

  const clear = useCallback((color: [number, number, number, number] = [0, 0, 0, 1]) => {
    if (!gl) return;
    gl.clearColor(...color);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }, [gl]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gl) return;

    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      gl.viewport(0, 0, displayWidth, displayHeight);
    }
  }, [gl]);

  return { canvasRef, gl, isSupported, isWebGL2, createShader, createProgram, clear, resize };
}

export default useWebGL;
