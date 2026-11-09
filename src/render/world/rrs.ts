import * as THREE from 'three';

/** Decode a static scenery mesh (.rrs v1, written by scripts/blender/scenery.py) into non-indexed, per-face-colored geometry. */
export function decodeRrs(bytes: Uint8Array): THREE.BufferGeometry {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== 'RRS1') throw new Error('not an RRS1 file');
  const nV = dv.getUint32(4, true), nT = dv.getUint32(8, true);
  let o = 12;
  const vp = new Float32Array(nV * 3);
  for (let i = 0; i < nV * 3; i++, o += 4) vp[i] = dv.getFloat32(o, true);
  const big = nV > 65535;
  const lin = (c: number) => { const x = c / 255; return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  const pos = new Float32Array(nT * 9), col = new Float32Array(nT * 9);
  for (let t = 0; t < nT; t++) {
    const ids = big ? [dv.getUint32(o, true), dv.getUint32(o + 4, true), dv.getUint32(o + 8, true)] : [dv.getUint16(o, true), dv.getUint16(o + 2, true), dv.getUint16(o + 4, true)];
    o += big ? 12 : 6;
    const r = lin(bytes[o]), g = lin(bytes[o + 1]), b = lin(bytes[o + 2]);
    o += 3;
    for (let k = 0; k < 3; k++) {
      pos.set(vp.subarray(ids[k] * 3, ids[k] * 3 + 3), (t * 3 + k) * 3);
      col[(t * 3 + k) * 3] = r; col[(t * 3 + k) * 3 + 1] = g; col[(t * 3 + k) * 3 + 2] = b;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

export function decodeRrsDataUrl(url: string) {
  const bin = atob(url.slice(url.indexOf(',') + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return decodeRrs(bytes);
}
