"use client";

import { useEffect, useRef, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import styles from "./Game.module.css";

const W = 360;
const H = 640;
const CAT_W = 56;
const CAT_H = 78;
const PX_PER_METER = 15;

type Phase = "menu" | "intro" | "ready" | "playing" | "dead";

type Frailejon = {
  x: number;
  y: number;
  vy: number;
  vx: number;
  scale: number;
  rot: number;
  rotV: number;
  swayT: number;
  variant: number;
};

// GIFs de gatos riéndose (URLs directas verificadas de Tenor)
const LAUGHING_CAT_GIFS = [
  "https://media.tenor.com/V0FLLrKvlpUAAAAC/cat-laughing-cat.gif",
  "https://media.tenor.com/aSkdq3IU0g0AAAAC/laughing-cat.gif",
  "https://media.tenor.com/fYYko0NnApAAAAAC/goma-cat-laugh-goma-laugh.gif",
  "https://media.tenor.com/Py7XrrxlfasAAAAC/lmao-lmao-meme.gif",
  "https://media.tenor.com/GbUgZXpSmT4AAAAC/cat-meng.gif",
];

const IMG_SRC = {
  sky: "/sprites/sky.webp",
  clouds: "/sprites/clouds.webp",
  ground: "/sprites/ground.webp",
  fly: "/sprites/fly.webp",
  flyup: "/sprites/flyup.webp",
  fall: "/sprites/fall.webp",
  boom: "/sprites/boom.webp",
} as const;

// Frailejón (Espeletia) procedural: roseta de hojas plateadas alargadas,
// flores amarillas en tallos y tronco grueso cubierto de hojas secas.
const FJ_W = 48;
const FJ_H = 72;

function makeFrailejonVariant(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = FJ_W;
  c.height = FJ_H;
  const g = c.getContext("2d")!;
  const cx = FJ_W / 2;
  const cy = 22;

  // tronco con textura de necromasa (hojas secas adheridas)
  const trunkW = 11 + Math.floor(Math.random() * 3);
  const trunkTop = cy + 2;
  for (let y = trunkTop; y < FJ_H; y++) {
    const x0 = Math.round(cx - trunkW / 2);
    for (let x = x0; x < x0 + trunkW; x++) {
      const r = Math.random();
      g.fillStyle = r < 0.14 ? "#5d3c20" : r < 0.34 ? "#8a6a3c" : "#6e4a2a";
      g.fillRect(x, y, 1, 1);
    }
  }
  for (let y = trunkTop + 3; y < FJ_H; y += 3) {
    g.fillStyle = "rgba(35, 20, 8, 0.45)";
    g.fillRect(Math.round(cx - trunkW / 2), y, trunkW, 1);
  }

  // falda de hojas secas colgantes bajo la roseta
  for (let i = -2; i <= 2; i++) {
    const lx = cx + i * 4.5;
    g.fillStyle = i % 2 ? "#9c7a45" : "#86653a";
    g.beginPath();
    g.moveTo(lx - 2.5, trunkTop + 1);
    g.lineTo(lx + 2.5, trunkTop + 1);
    g.lineTo(lx, trunkTop + 8 + Math.random() * 5);
    g.closePath();
    g.fill();
  }

  // roseta: hojas lanceoladas plateadas radiando desde el centro
  const leaves = 15 + Math.floor(Math.random() * 5);
  const shades = ["#cdd9a8", "#aec57f", "#93ab68", "#bccf92"];
  for (let i = 0; i < leaves; i++) {
    const ang = (i / leaves) * Math.PI * 2 + Math.random() * 0.25;
    const len = 14 + Math.random() * 7;
    // roseta vista de lado: aplastada hacia abajo
    const dy = Math.sin(ang) * (Math.sin(ang) > 0 ? 0.4 : 0.85);
    const ex = cx + Math.cos(ang) * len;
    const ey = cy + dy * len;
    const px = -Math.sin(ang) * 1.8;
    const py = Math.cos(ang) * 1.8;
    g.fillStyle = shades[i % shades.length];
    g.beginPath();
    g.moveTo(cx + px, cy + py);
    g.lineTo(cx - px, cy - py);
    g.lineTo(ex, ey);
    g.closePath();
    g.fill();
  }

  // núcleo de la roseta (hojas jóvenes, más claras y aterciopeladas)
  g.fillStyle = "#dde6bd";
  g.beginPath();
  g.arc(cx, cy, 4.2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#c2d398";
  g.beginPath();
  g.arc(cx, cy, 2.2, 0, Math.PI * 2);
  g.fill();

  // flores amarillas tipo margarita en tallos altos
  const flowers = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < flowers; i++) {
    const fx = cx + (i - (flowers - 1) / 2) * 9 + (Math.random() - 0.5) * 4;
    const fy = cy - 12 - Math.random() * 7;
    g.strokeStyle = "#76914e";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(cx + (fx - cx) * 0.25, cy - 2);
    g.quadraticCurveTo(fx, (cy + fy) / 2, fx, fy);
    g.stroke();
    // pétalos
    g.fillStyle = "#ffd23f";
    for (let p = 0; p < 6; p++) {
      const pa = (p / 6) * Math.PI * 2;
      g.fillRect(fx + Math.cos(pa) * 2.6 - 1, fy + Math.sin(pa) * 2.6 - 1, 2.2, 2.2);
    }
    g.fillStyle = "#d98e04";
    g.fillRect(fx - 1.4, fy - 1.4, 2.8, 2.8);
  }

  return c;
}

// pseudo-aleatorio determinista por fila de nubes
function pseudo(j: number): number {
  const v = Math.sin(j * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const introVideoRef = useRef<HTMLVideoElement | null>(null);

  const [phase, setPhase] = useState<Phase>("menu");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const [gifKey, setGifKey] = useState(0);
  const [gifTries, setGifTries] = useState(0);
  const [showPoster, setShowPoster] = useState(false);
  const crashCountRef = useRef(0);

  const phaseRef = useRef<Phase>("menu");
  const apiRef = useRef<{ startRun: () => void; prepare: () => void } | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  useEffect(() => {
    try {
      setBest(Number(localStorage.getItem("ff-best") || 0));
    } catch {}
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imgs = {} as Record<keyof typeof IMG_SRC, HTMLImageElement>;
    (Object.keys(IMG_SRC) as (keyof typeof IMG_SRC)[]).forEach((k) => {
      const im = new Image();
      im.src = IMG_SRC[k];
      imgs[k] = im;
    });
    const fjSprites = [makeFrailejonVariant(), makeFrailejonVariant(), makeFrailejonVariant(), makeFrailejonVariant()];

    const music = new Audio("/sprites/music.ogg");
    music.loop = true;
    music.volume = 0.45;
    musicRef.current = music;
    const boomSfx = new Audio("/sprites/boom.mp3");
    boomSfx.volume = 0.8;
    const launchSfx = new Audio("/sprites/flap.mp3");
    launchSfx.volume = 0.55;

    const s = {
      alt: 0,
      speed: 0,
      launchT: 0,
      catX: W / 2,
      catY: H * 0.62,
      catVX: 0,
      targetX: null as number | null,
      keys: { left: false, right: false },
      frail: [] as Frailejon[],
      nextSpawn: 0,
      boomT: 0,
      shake: 0,
      deadFallV: 0,
      lastMeters: -1,
      stars: [] as { x: number; y: number; r: number; tw: number }[],
    };
    for (let i = 0; i < 70; i++) {
      s.stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() < 0.8 ? 1 : 2,
        tw: Math.random() * Math.PI * 2,
      });
    }

    function reset() {
      s.alt = 0;
      s.speed = 0;
      s.launchT = 0;
      s.catX = W / 2;
      s.catY = H * 0.62;
      s.catVX = 0;
      s.targetX = null;
      s.keys.left = false;
      s.keys.right = false;
      s.frail = [];
      s.nextSpawn = 0;
      s.boomT = 0;
      s.shake = 0;
      s.deadFallV = 0;
      s.lastMeters = -1;
      setScore(0);
    }

    function prepare() {
      reset();
      setPhaseBoth("ready");
    }

    function startRun() {
      reset();
      setPhaseBoth("playing");
      launchSfx.currentTime = 0;
      launchSfx.play().catch(() => {});
      music.play().catch(() => {});
      try {
        sendGAEvent("event", "game_start", {
          attempt: crashCountRef.current + 1,
        });
      } catch {}
    }

    apiRef.current = { startRun, prepare };

    function spawn() {
      const scale = 0.9 + Math.random() * 0.6;
      const w = FJ_W * scale;
      const h = FJ_H * scale;
      s.frail.push({
        x: w / 2 + Math.random() * (W - w),
        y: -h,
        vy: 0.8 + Math.random() * 1.7,
        vx: (Math.random() - 0.5) * 1.2,
        scale,
        rot: (Math.random() - 0.5) * 0.5,
        rotV: (Math.random() - 0.5) * 0.012,
        swayT: Math.random() * Math.PI * 2,
        variant: Math.floor(Math.random() * fjSprites.length),
      });
    }

    function hit(f: Frailejon) {
      const fw = FJ_W * f.scale * 0.6;
      const fh = FJ_H * f.scale * 0.55;
      // rotados 180°, la roseta (masa principal) queda bajo el centro
      const fcy = f.y + FJ_H * f.scale * 0.18;
      const fx = f.x - fw / 2;
      const fy = fcy - fh / 2;
      const cx = s.catX - CAT_W / 2 + 10;
      const cy = s.catY - CAT_H / 2 + 12;
      const cw = CAT_W - 20;
      const ch = CAT_H - 24;
      return fx < cx + cw && fx + fw > cx && fy < cy + ch && fy + fh > cy;
    }

    function die() {
      if (phaseRef.current !== "playing") return;
      setPhaseBoth("dead");
      s.boomT = 1;
      s.shake = 14;
      s.deadFallV = -2;
      boomSfx.currentTime = 0;
      boomSfx.play().catch(() => {});
      const meters = Math.floor(s.alt / PX_PER_METER);
      setBest((b) => {
        const nb = Math.max(b, meters);
        try {
          localStorage.setItem("ff-best", String(nb));
        } catch {}
        return nb;
      });
      setGifKey(Math.floor(Math.random() * LAUGHING_CAT_GIFS.length));
      setGifTries(0);
      crashCountRef.current += 1;
      // el póster sale en todas las derrotas
      setShowPoster(true);
      try {
        sendGAEvent("event", "game_over", {
          score_meters: meters,
          crash_count: crashCountRef.current,
        });
      } catch {}
      window.setTimeout(() => setGameOverVisible(true), 900);
    }

    function update(dt: number, now: number) {
      const n = Math.min(dt, 50) / 16.6667;
      if (s.boomT > 0) s.boomT = Math.max(0, s.boomT - dt * 0.0018);
      if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 0.02);

      if (phaseRef.current === "dead") {
        s.deadFallV += 0.35 * n;
        s.catY += s.deadFallV * n;
        // los frailejones siguen cayendo de fondo en la pantalla de derrota
        for (let i = s.frail.length - 1; i >= 0; i--) {
          const f = s.frail[i];
          f.swayT += dt * 0.002;
          f.y += (1.6 + f.vy) * n;
          f.x += (f.vx + Math.sin(f.swayT) * 0.6) * n;
          f.rot += f.rotV * n;
          if (f.y - FJ_H * f.scale > H + 40) s.frail.splice(i, 1);
        }
        if (now >= s.nextSpawn) {
          spawn();
          s.nextSpawn = now + 700 + Math.random() * 700;
        }
        return;
      }
      if (phaseRef.current !== "playing") return;

      s.launchT += dt;
      const targetSpeed = Math.min(7.2, 2.8 + s.alt / 3800);
      s.speed = targetSpeed * Math.min(1, s.launchT / 900);
      s.alt += s.speed * n;

      const maxV = 6;
      if (s.keys.left) s.catVX -= 0.9 * n;
      else if (s.keys.right) s.catVX += 0.9 * n;
      else if (s.targetX != null) {
        s.catVX = (s.targetX - s.catX) * 0.18;
      } else {
        s.catVX *= Math.pow(0.88, n);
      }
      s.catVX = Math.max(-maxV, Math.min(maxV, s.catVX));
      s.catX += s.catVX * n;
      s.catX = Math.max(CAT_W / 2, Math.min(W - CAT_W / 2, s.catX));

      if (s.launchT > 1200 && now >= s.nextSpawn) {
        spawn();
        // a mayor altura, más frailejones: lluvia progresiva
        if (s.alt > 4000 && Math.random() < Math.min(0.55, (s.alt - 4000) / 18000)) spawn();
        if (s.alt > 12000 && Math.random() < 0.25) spawn();
        const interval = Math.max(240, 1100 - s.alt / 14);
        s.nextSpawn = now + interval * (0.7 + Math.random() * 0.6);
      }

      for (let i = s.frail.length - 1; i >= 0; i--) {
        const f = s.frail[i];
        f.swayT += dt * 0.002;
        f.y += (s.speed + f.vy) * n;
        f.x += (f.vx + Math.sin(f.swayT) * 0.6) * n;
        f.rot += f.rotV * n;
        if (f.y - 16 * f.scale > H + 40) {
          s.frail.splice(i, 1);
          continue;
        }
        if (hit(f)) {
          die();
          return;
        }
      }

      const meters = Math.floor(s.alt / PX_PER_METER);
      if (meters !== s.lastMeters) {
        s.lastMeters = meters;
        setScore(meters);
      }
    }

    function drawSky() {
      const im = imgs.sky;
      if (im.complete && im.naturalWidth > 0) {
        ctx!.drawImage(im, 0, 0, W, H);
      } else {
        const g = ctx!.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, "#4a90d9");
        g.addColorStop(1, "#a8d5f2");
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, W, H);
      }
      // se oscurece al subir (espacio)
      const night = Math.min(0.55, Math.max(0, (s.alt - 3000) / 14000));
      if (night > 0) {
        ctx!.fillStyle = `rgba(8, 10, 40, ${night})`;
        ctx!.fillRect(0, 0, W, H);
      }
    }

    function drawStars(now: number) {
      const a = Math.min(0.9, Math.max(0, (s.alt - 4000) / 7000));
      if (a <= 0) return;
      for (const st of s.stars) {
        const y = (st.y + s.alt * 0.12) % H;
        const tw = 0.5 + 0.5 * Math.sin(now * 0.004 + st.tw);
        ctx!.fillStyle = `rgba(255,255,255,${(a * (0.4 + 0.6 * tw)).toFixed(3)})`;
        ctx!.fillRect(st.x, y, st.r, st.r);
      }
    }

    function drawClouds() {
      const im = imgs.clouds;
      if (!im.complete || im.naturalWidth === 0) return;
      const cw = W * 1.35;
      const ch = (cw * im.naturalHeight) / im.naturalWidth;
      const fade = 1 - Math.min(0.85, Math.max(0, (s.alt - 5000) / 10000));
      for (const layer of [
        { speed: 0.45, alpha: 0.95 * fade },
        { speed: 0.75, alpha: 0.6 * fade },
      ]) {
        const spacing = 320;
        const sc = s.alt * layer.speed;
        const jMin = Math.ceil((sc - H - ch) / spacing);
        const jMax = Math.floor((sc + ch) / spacing);
        ctx!.globalAlpha = layer.alpha;
        for (let j = jMin; j <= jMax; j++) {
          const y = sc - j * spacing;
          if (y < -ch || y > H) continue;
          const xv = pseudo(j + layer.speed * 100);
          ctx!.drawImage(im, -cw * 0.25 + xv * (W - cw * 0.5), y, cw, ch);
        }
      }
      ctx!.globalAlpha = 1;
    }

    function drawGround() {
      const top = H - 130 + s.alt;
      if (top > H) return;
      const im = imgs.ground;
      if (im.complete && im.naturalWidth > 0) {
        const scale = 130 / im.naturalHeight;
        const tw = Math.ceil(im.naturalWidth * scale);
        let x = 0;
        while (x < W) {
          ctx!.drawImage(im, x, top, tw + 1, 130);
          x += tw;
        }
      } else {
        ctx!.fillStyle = "#3f7d32";
        ctx!.fillRect(0, top, W, 130);
      }
    }

    function drawFrailejon(f: Frailejon) {
      const w = FJ_W * f.scale;
      const h = FJ_H * f.scale;
      ctx!.save();
      ctx!.translate(f.x, f.y);
      // caen de cabeza, como naves en picada
      ctx!.rotate(Math.PI + f.rot + Math.sin(f.swayT) * 0.15);
      ctx!.imageSmoothingEnabled = false;
      ctx!.drawImage(fjSprites[f.variant], -w / 2, -h / 2, w, h);
      ctx!.restore();
    }

    function drawCat(now: number) {
      const dead = phaseRef.current === "dead";
      const playing = phaseRef.current === "playing";
      const im = dead ? imgs.fall : Math.abs(s.catVX) > 3 ? imgs.flyup : imgs.fly;
      const tilt = dead ? Math.min(1.6, (s.catY - H * 0.62) * 0.004) : s.catVX * 0.045;
      const bob = dead ? 0 : Math.sin(now * 0.004) * 3;
      ctx!.save();
      ctx!.translate(s.catX, s.catY + bob);
      ctx!.rotate(tilt);
      if (im.complete && im.naturalWidth > 0) {
        ctx!.drawImage(im, -CAT_W / 2, -CAT_H / 2, CAT_W, CAT_H);
      } else {
        ctx!.fillStyle = "#ffe94e";
        ctx!.fillRect(-CAT_W / 2, -CAT_H / 2, CAT_W, CAT_H);
      }
      if (playing) {
        // estela de propulsión retro
        const t = Math.floor(now / 60) % 3;
        const flames = ["#ffd23f", "#ff8c1a", "#ff5722"];
        ctx!.fillStyle = flames[t];
        ctx!.fillRect(-5, CAT_H / 2 - 4, 10, 8);
        ctx!.fillStyle = flames[(t + 1) % 3];
        ctx!.fillRect(-3, CAT_H / 2 + 4, 6, 7 + t * 3);
      }
      ctx!.restore();
    }

    function drawBoom() {
      const im = imgs.boom;
      if (!im.complete || im.naturalWidth === 0 || s.boomT <= 0) return;
      const size = CAT_H * (1.3 + (1 - s.boomT) * 0.9);
      ctx!.globalAlpha = s.boomT;
      ctx!.drawImage(im, s.catX - size / 2, s.catY - size / 2, size, size);
      ctx!.globalAlpha = 1;
    }

    function draw(now: number) {
      ctx!.save();
      if (s.shake > 0) {
        ctx!.translate((Math.random() - 0.5) * s.shake, (Math.random() - 0.5) * s.shake);
      }
      drawSky();
      drawStars(now);
      drawClouds();
      drawGround();
      for (const f of s.frail) drawFrailejon(f);
      if (phaseRef.current !== "menu" && phaseRef.current !== "intro") drawCat(now);
      drawBoom();
      ctx!.restore();
    }

    let raf = 0;
    let last = performance.now();
    function loop(now: number) {
      const dt = now - last;
      last = now;
      update(dt, now);
      draw(now);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    function canvasX(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      return ((e.clientX - r.left) / r.width) * W;
    }

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      if (phaseRef.current === "ready") {
        startRun();
        return;
      }
      if (phaseRef.current === "playing") {
        s.targetX = canvasX(e);
        s.keys.left = false;
        s.keys.right = false;
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (phaseRef.current !== "playing") return;
      s.targetX = canvasX(e);
      s.keys.left = false;
      s.keys.right = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        s.keys.left = true;
        s.targetX = null;
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        s.keys.right = true;
        s.targetX = null;
      } else if (e.code === "Space" || e.code === "ArrowUp" || e.code === "Enter") {
        if (phaseRef.current === "ready") {
          e.preventDefault();
          startRun();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") s.keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") s.keys.right = false;
    };
    const onVisibility = () => {
      if (document.hidden) music.pause();
      else if (phaseRef.current !== "menu") music.play().catch(() => {});
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
      music.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStart = () => {
    musicRef.current?.play().catch(() => {});
    setPhaseBoth("intro");
    const v = introVideoRef.current;
    if (v) {
      v.currentTime = 0;
      v.playbackRate = 1.3;
      v.play().catch(() => apiRef.current?.prepare());
    } else {
      apiRef.current?.prepare();
    }
  };

  const handleIntroEnded = () => apiRef.current?.prepare();

  const handleSkipIntro = () => {
    introVideoRef.current?.pause();
    apiRef.current?.prepare();
  };

  const handleRestart = () => {
    setGameOverVisible(false);
    apiRef.current?.startRun();
  };

  return (
    <div className={styles.wrapper}>
      <canvas ref={canvasRef} width={W} height={H} className={styles.canvas} />

      {(phase === "playing" || phase === "dead") && (
        <div className={styles.hud}>
          <div className={styles.scoreBox}>
            ALTURA
            <br />
            <span>{score} m</span>
          </div>
          <div className={styles.scoreBox}>
            MÁXIMO
            <br />
            <span>{best} m</span>
          </div>
        </div>
      )}

      {phase === "menu" && (
        <div className={styles.overlay}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sprites/splash.webp" alt="" className={styles.splash} />
          <div className={styles.panel}>
            <h1 className={styles.title}>
              A VOLAR
              <br />
              FACHO
            </h1>
            <p className={styles.subtitle}>FIRMES A LA CÁRCEL</p>
            <div className={styles.scoresRow}>
              <div className={styles.scoreItem}>
                MÁXIMO<b>{best} m</b>
              </div>
            </div>
            <button className={styles.btn} onClick={handleStart}>
              ▶ EMPEZAR
            </button>
          </div>
          <p className={styles.credit}>
            By{" "}
            <a
              href="https://www.instagram.com/cristhian_lunaa"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cristhian Luna
            </a>{" "}
            - Team Cauca
          </p>
        </div>
      )}

      <div
        className={styles.videoWrap}
        style={{ display: phase === "intro" ? "block" : "none" }}
      >
        <video
          ref={introVideoRef}
          src="/sprites/videoInicio.webm"
          playsInline
          onEnded={handleIntroEnded}
          className={styles.video}
        />
        <button className={styles.skipBtn} onClick={handleSkipIntro}>
          SALTAR ▶
        </button>
      </div>

      {phase === "ready" && (
        <div className={styles.tapPrompt}>
          <p className={styles.tapMain}>TOCA PARA DESPEGAR</p>
          <p className={styles.tapSub}>← → / A D / ARRASTRA PARA MOVERTE</p>
        </div>
      )}

      {gameOverVisible && showPoster && (
        <div className={styles.overlay}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/poster.jpg" alt="Vota por la vida" className={styles.poster} />
          <button className={styles.btn} onClick={handleRestart}>
            ↺ REINTENTAR
          </button>
        </div>
      )}

      {gameOverVisible && !showPoster && (
        <div className={styles.overlay}>
          <div className={styles.panel}>
            <h2 className={styles.gameOverTitle}>¡TE ESTRELLASTE!</h2>
            <div className={styles.catGifFrame}>
              {gifTries < LAUGHING_CAT_GIFS.length ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={gifKey + gifTries}
                  src={LAUGHING_CAT_GIFS[(gifKey + gifTries) % LAUGHING_CAT_GIFS.length]}
                  alt="Gato riéndose de ti"
                  className={styles.catGif}
                  onError={() => setGifTries((t) => t + 1)}
                />
              ) : (
                <div className={styles.catEmoji}>😹</div>
              )}
              <span className={styles.laugh}>JAJAJAJA</span>
            </div>
            <div className={styles.scoresRow}>
              <div className={styles.scoreItem}>
                ALTURA<b>{score} m</b>
              </div>
              <div className={styles.scoreItem}>
                MÁXIMO<b>{best} m</b>
              </div>
            </div>
            <button className={styles.btn} onClick={handleRestart}>
              ↺ REINTENTAR
            </button>
          </div>
        </div>
      )}

      <div className={styles.scanlines} />
    </div>
  );
}
