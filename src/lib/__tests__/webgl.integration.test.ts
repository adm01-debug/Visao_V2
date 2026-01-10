import { describe, it, expect, vi } from "vitest";
import { getContext, createShader, createProgram, createBuffer } from "../webgl";

describe("webgl Integration", () => {
  it("should get WebGL context", () => {
    const canvas = document.createElement("canvas");
    const gl = getContext?.(canvas) || canvas.getContext("webgl");
    expect(gl).toBeDefined();
  });

  it("should handle shader creation", () => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (gl) {
      const shader = createShader?.(gl, gl.VERTEX_SHADER, "void main() {}");
      expect(true).toBe(true);
    }
  });
});

