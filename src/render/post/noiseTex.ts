import * as THREE from 'three';

/**
 * Tiling noise texture baked once at startup, so post passes read noise instead of computing fbm per pixel.
 * R: fine paper grain, G: medium wash, B: large wash, A: wobble. All channels tile seamlessly.
 */
export function bakeNoiseTexture(size = 256, seed = 7): THREE.DataTexture {
  let s = seed >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const lattice = (n: number) => Float32Array.from({ length: n * n }, rnd);
  // Periodic value noise at lattice resolution n (wraps at the texture edge).
  const layer = (n: number) => {
    const L = lattice(n);
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const fx = (x / size) * n, fy = (y / size) * n;
      const x0 = Math.floor(fx), y0 = Math.floor(fy);
      const tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const g = (i: number, j: number) => L[((j % n) + n) % n * n + (((i % n) + n) % n)];
      const a = g(x0, y0), b = g(x0 + 1, y0), c = g(x0, y0 + 1), d = g(x0 + 1, y0 + 1);
      out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
    return out;
  };
  const fbm = (base: number, oct: number) => {
    const acc = new Float32Array(size * size);
    let amp = 0.5, n = base, norm = 0;
    for (let o = 0; o < oct; o++) {
      const l = layer(n);
      for (let i = 0; i < acc.length; i++) acc[i] += l[i] * amp;
      norm += amp; amp *= 0.5; n *= 2;
    }
    for (let i = 0; i < acc.length; i++) acc[i] /= norm;
    return acc;
  };
  const r = fbm(32, 3), g = fbm(8, 4), b = fbm(2, 4), a = fbm(16, 2);
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = Math.round(r[i] * 255); data[i * 4 + 1] = Math.round(g[i] * 255);
    data[i * 4 + 2] = Math.round(b[i] * 255); data[i * 4 + 3] = Math.round(a[i] * 255);
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
