"use client";

import { Canvas, createPortal, useFrame, useThree } from "@react-three/fiber";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { cn } from "@/lib/utils";

type PingPongUniforms = {
  u_time: { value: number };
  u_resolution: { value: THREE.Vector3 };
  u_mouse: { value: THREE.Vector2 };
  u_channel0: { value: THREE.Texture | null };
};

type UniformsRef = RefObject<PingPongUniforms | null>;

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentBufferA = `
precision highp float;

varying vec2 vUv;
uniform float u_time;
uniform vec3 u_resolution;
uniform sampler2D u_channel0;
uniform vec2 u_mouse;

float sdOrientedBox(in vec2 p, in vec2 a, in vec2 b, float th) {
  float l = length(b-a);
  vec2  d = (b-a)/l;
  vec2  q = p-(a+b)*0.5;
  q = mat2(d.x,-d.y,d.y,d.x)*q;
  q = abs(q)-vec2(l*0.5,th);
  return length(max(q,0.0)) + min(max(q.x,q.y),0.0);    
}

float sdCross(in vec2 p, float th, float crossRadius) {
  float upper = 1. - crossRadius;
  float lower = 0. + crossRadius;
  vec2 v1 = vec2(lower, upper);
  vec2 v12 = vec2(upper, lower);
  vec2 v2 = vec2(lower, lower);
  vec2 v22 = vec2(upper, upper);

  float d1 = sdOrientedBox(p, v1,  v12, th);
  float d2 = sdOrientedBox(p, v2,  v22, th);

  float c1 = 1.0 - step(0.01, d1);
  float c2 = 1.0 - step(0.01, d2);
  return max(c1, c2);
}

float square(in vec2 p, float size) {
  vec2 c = p - 0.5;
  vec2 halfsq = vec2(size * 0.5);
  return step(abs(c.x), halfsq.x) * step(abs(c.y), halfsq.y);
}

float line(in vec2 p, float radius) {
  float upper = 1.0 - radius;
  float lower = 0.0 + radius;
  vec2 v1  = vec2(lower, lower);
  vec2 v12 = vec2(upper, upper);
  float d = sdOrientedBox(p, v1, v12, 0.028);
  return 1.0 - step(0.01, d);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / u_resolution.xy;

  float ar = u_resolution.y / u_resolution.x;
  uv.y *= ar;

  float GRID_SIZE = 25.0;
  float gridSizeInverse = 1.0 / GRID_SIZE;
  vec2 uv1 = uv * GRID_SIZE;
  vec2 uv_i = floor(uv1);
  vec2 uv_f = fract(uv1);

  vec2 cellCenter = (uv_i + 0.5) * gridSizeInverse;

  vec2 m = u_mouse;
  m.y *= ar;

  const float ACTIVATION_RADIUS = 0.05;
  const float AGE_INCREMENT = 0.025;

  vec4 prev = texture2D(u_channel0, vUv);
  float age = prev.r;
  float isActive = prev.g;

  float activation = 0.0;
  if (u_mouse.x >= 0.0) {
    float distToMouse = distance(cellCenter, m);
    activation = 1.0 - step(ACTIVATION_RADIUS, distToMouse);
  }

  if (activation > 0.0) {
    age = 0.0;
    isActive = 1.0;
  } else if (isActive > 0.5) {
    age = min(age + AGE_INCREMENT, 1.0);
    if (age >= 1.0) {
      age = 0.0;
      isActive = 0.0;
    }
  } else {
    age = 0.0;
    isActive = 0.0;
  }

  fragColor = vec4(age, isActive, 0.0, 1.0);
}

void main() {
  vec4 fragColor;
  vec2 fragCoord = vUv * u_resolution.xy;
  mainImage(fragColor, fragCoord);
  gl_FragColor = fragColor;
}
`;

const fragmentImage = `
precision highp float;

varying vec2 vUv;
uniform vec3 u_resolution;
uniform sampler2D u_channel0;

float sdOrientedBox(in vec2 p, in vec2 a, in vec2 b, float th) {
  float l = length(b-a);
  vec2  d = (b-a)/l;
  vec2  q = p-(a+b)*0.5;
  q = mat2(d.x,-d.y,d.y,d.x)*q;
  q = abs(q)-vec2(l*0.5,th);
  return length(max(q,0.0)) + min(max(q.x,q.y),0.0);
}

float sdCross(in vec2 p, float th, float crossRadius) {
  float upper = 1. - crossRadius;
  float lower = 0. + crossRadius;
  vec2 v1 = vec2(lower, upper);
  vec2 v12 = vec2(upper, lower);
  vec2 v2 = vec2(lower, lower);
  vec2 v22 = vec2(upper, upper);

  float d1 = sdOrientedBox(p, v1,  v12, th);
  float d2 = sdOrientedBox(p, v2,  v22, th);

  float c1 = 1.0 - step(0.01, d1);
  float c2 = 1.0 - step(0.01, d2);
  return max(c1, c2);
}

float square(in vec2 p, float size) {
  vec2 c = p - 0.5;
  vec2 halfsq = vec2(size * 0.5);
  return step(abs(c.x), halfsq.x) * step(abs(c.y), halfsq.y);
}

float line(in vec2 p, float radius) {
  float upper = 1.0 - radius;
  float lower = 0.0 + radius;
  vec2 v1  = vec2(lower, lower);
  vec2 v12 = vec2(upper, upper);
  float d = sdOrientedBox(p, v1, v12, 0.028);
  return 1.0 - step(0.01, d);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 uv = fragCoord / u_resolution.xy;
  float ar = u_resolution.y / u_resolution.x;
  uv.y *= ar;

  float GRID_SIZE = 25.0;
  float gridSizeInverse = 1.0 / GRID_SIZE;

  vec2 uv1 = uv * GRID_SIZE;
  vec2 uv_i = floor(uv1);
  vec2 uv_f = fract(uv1);

  vec4 data = texture2D(u_channel0, vUv);
  float age = data.r;
  float isActive = data.g;

  const float AGE_STAGE_CROSS = 0.33;
  const float AGE_STAGE_LINE = 0.66;

  float shapeMask = 0.0;
  if (isActive > 0.5) {
    float stageSquare = 1.0 - step(AGE_STAGE_CROSS, age);
    float stageCross = step(AGE_STAGE_CROSS, age) * (1.0 - step(AGE_STAGE_LINE, age));
    float stageLine = step(AGE_STAGE_LINE, age);

    float squareShape = square(uv_f, 0.8);
    float crossShape = sdCross(uv_f, 0.028, 0.68);
    float lineShape = line(uv_f, 0.68);

    shapeMask = stageSquare * squareShape + stageCross * crossShape + stageLine * lineShape;
  }

  float dots = step(0.95, uv_f.x) * step(0.95, uv_f.y);

  vec3 col = max(vec3(shapeMask), vec3(dots));

  fragColor = vec4(col, 1.0);
}

void main() {
  vec4 fragColor;
  vec2 fragCoord = vUv * u_resolution.xy;
  mainImage(fragColor, fragCoord);
  gl_FragColor = fragColor;
}
`;

const ShaderPlane = ({
  vertexShader,
  fragmentShader,
  uniforms,
}: {
  vertexShader: string;
  fragmentShader: string;
  uniforms: PingPongUniforms;
}) => (
  <mesh>
    <planeGeometry args={[2, 2]} />
    <shaderMaterial
      vertexShader={vertexShader}
      fragmentShader={fragmentShader}
      uniforms={uniforms}
      side={THREE.FrontSide}
      depthTest={false}
      depthWrite={false}
    />
  </mesh>
);

const PingPongScene = ({ uniformsRef }: { uniformsRef: UniformsRef }) => {
  const bufferScene = useMemo(() => new THREE.Scene(), []);
  const imageScene = useMemo(() => new THREE.Scene(), []);
  const camera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    cam.position.set(0, 0, 1);
    cam.lookAt(0, 0, 0);
    return cam;
  }, []);
  const activeTarget = useRef<THREE.WebGLRenderTarget | null>(null);
  const passiveTarget = useRef<THREE.WebGLRenderTarget | null>(null);
  const { gl, size } = useThree();
  const glRef = useRef(gl);

  useEffect(() => {
    glRef.current = gl;
  }, [gl]);

  useEffect(() => {
    const previousAutoClear = glRef.current.autoClear;
    glRef.current.autoClear = false;
    return () => {
      if (glRef.current) {
        glRef.current.autoClear = previousAutoClear;
      }
    };
  }, []);

  const uniforms = useMemo<PingPongUniforms>(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector3(size.width, size.height, 1) },
      u_mouse: { value: new THREE.Vector2(-1, -1) },
      u_channel0: { value: null },
    }),
    [size.width, size.height]
  );

  useEffect(() => {
    uniformsRef.current = uniforms;
    return () => {
      if (uniformsRef.current === uniforms) uniformsRef.current = null;
    };
  }, [uniforms, uniformsRef]);

  useEffect(() => {
    const options = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    };

    const rt1 = new THREE.WebGLRenderTarget(size.width, size.height, options);
    const rt2 = new THREE.WebGLRenderTarget(size.width, size.height, options);

    activeTarget.current?.dispose();
    passiveTarget.current?.dispose();

    activeTarget.current = rt1;
    passiveTarget.current = rt2;

    uniforms.u_resolution.value.set(size.width, size.height, 1);

    const prevTarget = gl.getRenderTarget();
    const prevClearColor = gl.getClearColor(new THREE.Color()).clone();
    const prevClearAlpha = gl.getClearAlpha();

    gl.setClearColor(0x000000, 1);
    gl.setRenderTarget(rt1);
    gl.clear(true, true, true);
    gl.setRenderTarget(rt2);
    gl.clear(true, true, true);
    gl.setRenderTarget(prevTarget);
    gl.setClearColor(prevClearColor, prevClearAlpha);

    return () => {
      rt1.dispose();
      rt2.dispose();
    };
  }, [gl, size.width, size.height, uniforms]);

  const uniformsRefLocal = useRef(uniforms);

  useEffect(() => {
    uniformsRefLocal.current = uniforms;
  }, [uniforms]);

  useFrame(({ clock }) => {
    if (!activeTarget.current || !passiveTarget.current) return;

    uniformsRefLocal.current.u_time.value = clock.getElapsedTime();

    uniformsRefLocal.current.u_channel0.value = passiveTarget.current.texture;
    gl.setRenderTarget(activeTarget.current);
    gl.render(bufferScene, camera);

    const temp = activeTarget.current;
    activeTarget.current = passiveTarget.current;
    passiveTarget.current = temp;

    uniformsRefLocal.current.u_channel0.value = passiveTarget.current.texture;
    gl.setRenderTarget(null);
    gl.render(imageScene, camera);
  });

  return (
    <>
      {createPortal(
        <ShaderPlane
          vertexShader={vertexShader}
          fragmentShader={fragmentBufferA}
          uniforms={uniforms}
        />,
        bufferScene
      )}
      {createPortal(
        <ShaderPlane
          vertexShader={vertexShader}
          fragmentShader={fragmentImage}
          uniforms={uniforms}
        />,
        imageScene
      )}
    </>
  );
};

interface Shader8Props {
  className?: string;
}

const Shader8 = ({ className }: Shader8Props) => {
  const uniformsRef = useRef<PingPongUniforms | null>(null);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const uniforms = uniformsRef.current;
      if (!uniforms) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1.0 - (event.clientY - rect.top) / rect.height;
      uniforms.u_mouse.value.set(x, y);
    },
    []
  );

  const handlePointerLeave = useCallback(() => {
    const uniforms = uniformsRef.current;
    if (!uniforms) return;
    uniforms.u_mouse.value.set(-1, -1);
  }, []);

  return (
    <section
      className={cn(className, "absolute inset-0 h-screen w-full")}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas>
        <PingPongScene uniformsRef={uniformsRef} />
      </Canvas>
    </section>
  );
};

export { Shader8 };
