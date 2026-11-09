import { BONE_DEFS } from './model';

/** Decoded Blender raptor body (.rrm v1, written by scripts/blender/raptor.py). Non-indexed, per-face colors. */
export interface RrmBody {
  positions: Float32Array; // xyz per vertex (3 per triangle corner)
  colors: Float32Array; // linear rgb per vertex
  skinIndex: Uint16Array;
  skinWeight: Float32Array;
  tris: number;
}

const srgbToLinear = (c: number) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
};

export function decodeRrm(bytes: Uint8Array): RrmBody {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== 'RRM1') throw new Error(`not an RRM1 file (${magic})`);
  let o = 4;
  const nV = dv.getUint32(o, true), nT = dv.getUint32(o + 4, true), nB = dv.getUint32(o + 8, true);
  o += 12;
  const order = BONE_DEFS.map((d) => d[0] as string);
  const remap: number[] = [];
  for (let i = 0; i < nB; i++) {
    const len = bytes[o++];
    const name = new TextDecoder().decode(bytes.subarray(o, o + len));
    o += len;
    const idx = order.indexOf(name);
    if (idx < 0) throw new Error(`unknown bone ${name}`);
    remap.push(idx);
  }
  const vp = new Float32Array(nV * 3), vj = new Uint16Array(nV * 4), vw = new Float32Array(nV * 4);
  for (let i = 0; i < nV; i++) {
    vp[i * 3] = dv.getFloat32(o, true); vp[i * 3 + 1] = dv.getFloat32(o + 4, true); vp[i * 3 + 2] = dv.getFloat32(o + 8, true);
    o += 12;
    for (let k = 0; k < 4; k++) vj[i * 4 + k] = remap[bytes[o + k]] ?? 0;
    for (let k = 0; k < 4; k++) vw[i * 4 + k] = bytes[o + 4 + k] / 255;
    o += 8;
  }
  const positions = new Float32Array(nT * 9), colors = new Float32Array(nT * 9);
  const skinIndex = new Uint16Array(nT * 12), skinWeight = new Float32Array(nT * 12);
  for (let t = 0; t < nT; t++) {
    const ids = [dv.getUint16(o, true), dv.getUint16(o + 2, true), dv.getUint16(o + 4, true)];
    const r = srgbToLinear(bytes[o + 6]), g = srgbToLinear(bytes[o + 7]), b = srgbToLinear(bytes[o + 8]);
    o += 9;
    ids.forEach((vi, k) => {
      const c = t * 3 + k;
      positions.set(vp.subarray(vi * 3, vi * 3 + 3), c * 3);
      colors[c * 3] = r; colors[c * 3 + 1] = g; colors[c * 3 + 2] = b;
      skinIndex.set(vj.subarray(vi * 4, vi * 4 + 4), c * 4);
      skinWeight.set(vw.subarray(vi * 4, vi * 4 + 4), c * 4);
    });
  }
  return { positions, colors, skinIndex, skinWeight, tris: nT };
}

/** Decode a base64 data URL (as produced by Vite's ?inline import). */
export function decodeRrmDataUrl(url: string): RrmBody {
  const b64 = url.slice(url.indexOf(',') + 1);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return decodeRrm(bytes);
}
