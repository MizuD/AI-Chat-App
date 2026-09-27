"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import type { Motion, Portrait } from "@/lib/character/types";
import type { SpeechSignal } from "@/lib/chat/useVoice";
import { createPerformer, perform } from "@/lib/portrait/performer";
import { buildRig, CAVITY_DEPTH, deform, drawMouthMask, frameView, JAW_DROP, LIP_LIFT } from "@/lib/portrait/rig";

const VERTEX = /* glsl */ `
  attribute float depth;
  attribute float across;
  varying vec2 vUv;
  varying float vDepth;
  varying float vAcross;
  void main() {
    vUv = uv;
    vDepth = depth;
    vAcross = across;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// The photo with the original mouth opening cut out, so the jaw can drop to reveal what is behind.
const FACE_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D mask;
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(texture2D(map, vUv).rgb, 1.0 - texture2D(mask, vUv).r);
  }
`;

// Behind the face: the original upper teeth over a shadowed oral cavity. Lower teeth ride on the
// jaw (uniform lip = lower-lip depth) and are a darkened mirror of the photo's upper teeth, so tone matches.
const MOUTH_FRAGMENT = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D mask;
  uniform float lip;
  uniform vec2 uvOrigin;
  uniform vec2 uvAcross;
  uniform vec2 uvDown;
  uniform float depthTop;
  uniform float depthBottom;
  varying vec2 vUv;
  varying float vDepth;
  varying float vAcross;
  void main() {
    float d = vDepth;
    vec3 cavity = mix(vec3(0.045, 0.014, 0.018), vec3(0.12, 0.04, 0.045), smoothstep(0.0, max(lip, 0.05), d));
    float tongue = exp(-pow((vAcross - 0.5) / 0.26, 2.0) - pow((d - (lip - 0.32)) / 0.14, 2.0));
    cavity = mix(cavity, vec3(0.36, 0.13, 0.14), tongue * 0.5 * smoothstep(0.3, 0.7, lip));

    float band = 0.26;
    float t = (lip - d) / band;
    if (d > 0.0 && t > 0.0 && t < 1.0) {
      float dm = -0.02 - (1.0 - t) * band * 0.9;
      float frac = (dm - depthTop) / (depthBottom - depthTop);
      vec2 uvm = uvOrigin + (0.5 + (vAcross - 0.5) * 1.12) * uvAcross + frac * uvDown;
      float inMouth = smoothstep(0.3, 0.8, texture2D(mask, uvm).r);
      vec3 lower = texture2D(map, uvm).rgb * mix(0.55, 0.8, t);
      float soft = smoothstep(0.0, 0.18, t) * smoothstep(1.0, 0.85, t);
      cavity = mix(cavity, lower, inMouth * soft);
    }

    float upperTeeth = smoothstep(0.02, 0.35, texture2D(mask, vUv).r);
    gl_FragColor = vec4(mix(cavity, texture2D(map, vUv).rgb, upperTeeth), 1.0);
  }
`;

export function TalkingPortrait({
  portrait,
  signal,
  motion,
  showMesh = false,
  onReady,
}: {
  portrait: Portrait;
  signal: RefObject<SpeechSignal>;
  motion: Motion;
  showMesh?: boolean;
  onReady?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const motionRef = useRef(motion);
  const meshRef = useRef(showMesh);
  const readyRef = useRef(onReady);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    motionRef.current = motion;
    meshRef.current = showMesh;
    readyRef.current = onReady;
  }, [motion, showMesh, onReady]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";
    el.appendChild(renderer.domElement);

    const rig = buildRig(portrait);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);

    const image = new Image();
    const photo = new THREE.Texture(image);
    const mask = new THREE.CanvasTexture(drawMouthMask(rig));
    for (const tex of [photo, mask]) {
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
    }

    const facePositions = new Float32Array(rig.count * 3);
    const faceGeometry = new THREE.BufferGeometry();
    faceGeometry.setAttribute("position", new THREE.BufferAttribute(facePositions, 3).setUsage(THREE.DynamicDrawUsage));
    faceGeometry.setAttribute("uv", new THREE.BufferAttribute(rig.uv, 2));
    faceGeometry.setAttribute("depth", new THREE.BufferAttribute(new Float32Array(rig.count), 1));
    faceGeometry.setAttribute("across", new THREE.BufferAttribute(new Float32Array(rig.count), 1));
    faceGeometry.setIndex(new THREE.BufferAttribute(rig.index, 1));

    const mouthPositions = new Float32Array(12);
    const mouthGeometry = new THREE.BufferGeometry();
    mouthGeometry.setAttribute("position", new THREE.BufferAttribute(mouthPositions, 3).setUsage(THREE.DynamicDrawUsage));
    mouthGeometry.setAttribute("uv", new THREE.BufferAttribute(rig.mouthQuad.uv, 2));
    mouthGeometry.setAttribute("depth", new THREE.BufferAttribute(rig.mouthQuad.depth, 1));
    mouthGeometry.setAttribute("across", new THREE.BufferAttribute(rig.mouthQuad.across, 1));
    mouthGeometry.setIndex([0, 1, 2, 0, 2, 3]);

    const quadUv = rig.mouthQuad.uv;
    const mouthUniforms = {
      map: { value: photo },
      mask: { value: mask },
      lip: { value: 0 },
      uvOrigin: { value: new THREE.Vector2(quadUv[0], quadUv[1]) },
      uvAcross: { value: new THREE.Vector2(quadUv[2] - quadUv[0], quadUv[3] - quadUv[1]) },
      uvDown: { value: new THREE.Vector2(quadUv[6] - quadUv[0], quadUv[7] - quadUv[1]) },
      depthTop: { value: rig.mouthQuad.depth[0] },
      depthBottom: { value: rig.mouthQuad.depth[3] },
    };
    const mouthMaterial = new THREE.ShaderMaterial({
      uniforms: mouthUniforms,
      vertexShader: VERTEX,
      fragmentShader: MOUTH_FRAGMENT,
      side: THREE.DoubleSide,
      depthTest: false,
    });
    const faceMaterial = new THREE.ShaderMaterial({
      uniforms: { map: { value: photo }, mask: { value: mask } },
      vertexShader: VERTEX,
      fragmentShader: FACE_FRAGMENT,
      side: THREE.DoubleSide,
      transparent: true,
      depthTest: false,
    });
    const wireMaterial = new THREE.MeshBasicMaterial({ color: 0x7cf3ff, wireframe: true, transparent: true, opacity: 0.35, depthTest: false });

    const mouthMesh = new THREE.Mesh(mouthGeometry, mouthMaterial);
    const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
    const wireMesh = new THREE.Mesh(faceGeometry, wireMaterial);
    mouthMesh.renderOrder = 0;
    faceMesh.renderOrder = 1;
    wireMesh.renderOrder = 2;
    for (const mesh of [mouthMesh, faceMesh, wireMesh]) {
      mesh.frustumCulled = false;
      scene.add(mesh);
    }

    let loaded = false;
    image.onload = () => {
      photo.needsUpdate = true;
      loaded = true;
      readyRef.current?.();
    };
    image.src = portrait.src;

    const resize = () => renderer.setSize(el.clientWidth || 1, el.clientHeight || 1, false);
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const performer = createPerformer();
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!loaded) return;
      const t = now / 1000;
      const pose = perform(performer, signal.current, motionRef.current, t, dt);
      deform(rig, pose, facePositions, mouthPositions);
      mouthUniforms.lip.value = (pose.open * (JAW_DROP + LIP_LIFT)) / CAVITY_DEPTH;
      faceGeometry.attributes.position.needsUpdate = true;
      mouthGeometry.attributes.position.needsUpdate = true;
      wireMesh.visible = meshRef.current;

      // Slow handheld drift and breathing zoom, kept inside the view margin.
      const view = frameView(rig, el.clientWidth / Math.max(1, el.clientHeight));
      const drift = motionRef.current.head;
      const zoom = 1 + 0.012 * drift * (0.5 + 0.5 * Math.sin(t * 0.13));
      const w = view.w / zoom;
      const h = view.h / zoom;
      const x = view.x + (view.w - w) / 2 + Math.sin(t * 0.21) * (view.w - w) * 0.45;
      const y = view.y + (view.h - h) / 2 + Math.sin(t * 0.17 + 2) * (view.h - h) * 0.45;
      camera.left = x;
      camera.right = x + w;
      camera.top = -y;
      camera.bottom = -(y + h);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      image.onload = null;
      faceGeometry.dispose();
      mouthGeometry.dispose();
      faceMaterial.dispose();
      mouthMaterial.dispose();
      wireMaterial.dispose();
      photo.dispose();
      mask.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [portrait, signal]);

  if (failed) {
    // eslint-disable-next-line @next/next/no-img-element -- data URL portrait, nothing for next/image to optimize
    return <img src={portrait.src} alt="" className="h-full w-full object-cover" />;
  }
  return <div ref={host} className="h-full w-full" />;
}
