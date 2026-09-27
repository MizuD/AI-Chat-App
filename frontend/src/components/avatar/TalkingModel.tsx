"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Motion } from "@/lib/character/types";
import type { SpeechSignal } from "@/lib/chat/useVoice";
import { animate, createAnimator, type MorphName } from "@/lib/avatar/animator";

interface MorphBinding {
  mesh: THREE.Mesh;
  index: number;
}

export function TalkingModel({
  src,
  signal,
  motion,
  accent,
  onReady,
}: {
  src: string;
  signal: RefObject<SpeechSignal>;
  motion: Motion;
  accent: string;
  onReady?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const motionRef = useRef(motion);
  const readyRef = useRef(onReady);
  const accentRef = useRef(accent);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    motionRef.current = motion;
    readyRef.current = onReady;
    accentRef.current = accent;
  }, [motion, onReady, accent]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      queueMicrotask(() => setFailed(true));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.55;

    const key = new THREE.DirectionalLight(0xfff1e6, 2.2);
    key.position.set(2.5, 4, 5);
    const rim = new THREE.DirectionalLight(new THREE.Color(accentRef.current), 2.4);
    rim.position.set(-3.5, 3, -3);
    const fill = new THREE.HemisphereLight(0xdfe9ff, 0x3a3440, 0.9);
    scene.add(key, rim, fill);

    const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 100);
    const target = new THREE.Vector3(0, 1.3, 0);
    let halfHeight = 1.7;
    let halfWidth = 1.45;

    const morphs = new Map<MorphName, MorphBinding[]>();
    let head: THREE.Object3D | null = null;
    let body: THREE.Object3D | null = null;
    const headBase = new THREE.Euler();
    const bodyBaseY = { value: 0 };
    let model: THREE.Object3D | null = null;
    let disposed = false;

    new GLTFLoader().load(
      src,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        model.traverse((o) => {
          if (o instanceof THREE.Mesh && o.morphTargetDictionary && o.morphTargetInfluences) {
            for (const [name, index] of Object.entries(o.morphTargetDictionary)) {
              const list = morphs.get(name as MorphName) ?? [];
              list.push({ mesh: o, index });
              morphs.set(name as MorphName, list);
            }
          }
        });
        head = model.getObjectByName("Head") ?? null;
        body = model.getObjectByName("Body") ?? model;
        if (head) headBase.copy(head.rotation);
        bodyBaseY.value = body.position.y;
        scene.add(model);

        // Frame head and shoulders like a video call, sized by the head so narrow screens crop the arms.
        const top = new THREE.Box3().setFromObject(model).max.y;
        const headBox = new THREE.Box3().setFromObject(head ?? model);
        target.set(0, top - 1.8, 0);
        halfHeight = 1.95;
        halfWidth = (headBox.max.x - headBox.min.x) * 0.62;
        readyRef.current?.();
      },
      undefined,
      () => setFailed(true),
    );

    const pointer = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      pointer.y = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
    };
    window.addEventListener("pointermove", onPointer);

    const resize = () => renderer.setSize(el.clientWidth || 1, el.clientHeight || 1, false);
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    const animator = createAnimator();
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      const aspect = el.clientWidth / Math.max(1, el.clientHeight);
      camera.aspect = aspect;
      const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const distance = Math.max(halfHeight / tan, halfWidth / (tan * aspect));
      // Subtle handheld drift.
      camera.position.set(target.x + Math.sin(t * 0.21) * 0.04, target.y + 0.12 + Math.sin(t * 0.17) * 0.03, target.z + distance);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      rim.color.set(accentRef.current);

      if (model) {
        const pose = animate(animator, signal.current, motionRef.current, pointer, t, dt);
        for (const [name, bindings] of morphs) {
          const value = pose.morphs[name] ?? 0;
          for (const { mesh, index } of bindings) mesh.morphTargetInfluences![index] = value;
        }
        if (head) head.rotation.set(headBase.x + pose.head.pitch, headBase.y + pose.head.yaw, headBase.z + pose.head.roll);
        if (body) {
          body.position.y = bodyBaseY.value + pose.body.lift;
          body.rotation.y = pose.body.sway;
        }
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointer);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          for (const m of [o.material].flat()) m.dispose();
        }
      });
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src, signal]);

  if (failed) {
    return (
      <div className="grid h-full w-full place-items-center p-6 text-center text-sm text-white/60">
        3D表示を開始できませんでした。ブラウザのWebGL設定を確認してください。
      </div>
    );
  }
  return <div ref={host} className="h-full w-full" />;
}
