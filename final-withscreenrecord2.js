'use strict';

document.body.style.margin  = '0';
document.body.style.padding = '0';
document.body.style.background = '#000';
document.body.style.overflow   = 'hidden';

class Random {
  constructor() {
    this.useA = false;
    let sfc32 = function(uint128Hex) {
      let a = parseInt(uint128Hex.substring(0, 8), 16);
      let b = parseInt(uint128Hex.substring(8, 16), 16);
      let c = parseInt(uint128Hex.substring(16, 24), 16);
      let d = parseInt(uint128Hex.substring(24, 32), 16);
      return function() {
        a |= 0; b |= 0; c |= 0; d |= 0;
        let t = (((a + b) | 0) + d) | 0;
        d = (d + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
      };
    };
    this.prngA = new sfc32(tokenData.hash.substring(2, 34));
    this.prngB = new sfc32(tokenData.hash.substring(34, 66));
    for (let i = 0; i < 1e6; i += 2) { this.prngA(); this.prngB(); }
  }
  random_dec()          { this.useA = !this.useA; return this.useA ? this.prngA() : this.prngB(); }
  random_num(a, b)      { return a + (b - a) * this.random_dec(); }
  random_int(a, b)      { return Math.floor(this.random_num(a, b + 1)); }
  random_bool(p)        { return this.random_dec() < p; }
  random_choice(list)   { return list[this.random_int(0, list.length - 1)]; }
}

const R = new Random();

const WORLD_SCALE   = 0.01;
let PETAL_EXTRUDE = 0.35;
const LAYER_GAP     = 0.6;
const MAX_PETAL_R   = 1000 * 0.45 * WORLD_SCALE;
let N_PROFILE     = 8;
let STEPS_PER_SEG = 16;
const SHAPES = ['oval','pointy','spiky','exponential','reverseExp','blade','trap','trueHeart','sakura','tri','drop'];
const BUBBLY_SHAPES = ['oval','drop','trueHeart','sakura'];

const COLOR_PALETTES = {
  pearl:         { colors: ['#f5c8d0','#f9dde3','#fff8f9','#fffff0','#fffde8','#ddf0fd','#ffffff'], colorMode: 'sequential' },
  lapis_lazuli:  { colors: ['#050510','#080e35','#0a1450','#0e1e78','#1840c8','#c8d8ff'], colorMode: 'random' },
  garnet:        { colors: ['#0a0005','#280008','#3d1505','#500010','#880018','#c02020'], colorMode: 'random' },
  azurite:       { colors: ['#05050f','#1a1a4a','#2a3aaa','#6a4a9a','#00e5c0','#e8820a'], colorMode: 'mixed', mixChance: 0.4 },
  fire_opal:     { colors: ['#050000','#4a0a05','#8a1a10','#c8302a','#ff6600','#c8b030'], colorMode: 'sequential' },
  chalcopyrite:  { colors: ['#1a3a4a','#5a3010','#9a5020','#5a9aaa','#8ab8c8'], colorMode: 'sequential' },
  cobalt:        { colors: ['#02020f','#0a0a4a','#2a3ab0','#4a6acc','#8a3a1a'], colorMode: 'sequential' },
  malachite:     { colors: ['#020a04','#082010','#0c4820','#0a8030','#00b844','#00e855'], colorMode: 'random' },
  hematite:      { colors: ['#111111','#2a2a2a','#555555','#909090','#d4d4d4','#ffffff'], colorMode: 'sequential' },
  citrine:       { colors: ['#ff3d00','#ff7a00','#ffa800','#ffd000','#ffee58'], colorMode: 'mixed', mixChance: 0.4 },
  fluorite:      { colors: ['#020810','#0a2a3a','#a8e8d8','#0a6860','#a060c8','#ffe680','#e8c8f8'], colorMode: 'sequential' },
  cinnabar:      { colors: ['#080408','#280818','#781838','#d04060','#e89030','#f8d060'], colorMode: 'sequential' },
};

function hexToRGB(h) {
  h = h.replace('#','');
  return [
    parseInt(h.slice(0,2),16)/255,
    parseInt(h.slice(2,4),16)/255,
    parseInt(h.slice(4,6),16)/255
  ];
}

function cubicBezier(p0, hOut, hIn, p1, steps) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = i / steps, mt = 1 - t;
    pts.push([
      mt**3*p0[0] + 3*mt**2*t*hOut[0] + 3*mt*t**2*hIn[0] + t**3*p1[0],
      mt**3*p0[1] + 3*mt**2*t*hOut[1] + 3*mt*t**2*hIn[1] + t**3*p1[1]
    ]);
  }
  return pts;
}

function petalOutline(w, h, shape, steps = STEPS_PER_SEG) {
  let defs;
  if (shape === 'oval') {
    const K  = 0.5522847498;
    const rx = w / 2;
    const my = h * 0.7;
    const rt = h - my;
    const rb = my;
    defs = [
      [[0, h],    [-rx*K, h],         [rx*K, h]],
      [[rx, my],  [rx, my+rt*K],      [rx, my-rb*K]],
      [[0, 0],    [rx*K, 0],          [-rx*K, 0]],
      [[-rx, my], [-rx, my-rb*K],     [-rx, my+rt*K]],
    ];
  } else if (shape === 'spiky') {
    const corners = [[0,0],[-w/2,h*.3],[0,h],[w/2,h*.3]];
    const out = [];
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i], b = corners[(i+1)%corners.length];
      for (let s = 0; s < steps; s++) {
        const t = s/steps;
        out.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]);
      }
    }
    return out;
  } else if (shape === 'tri') {
    const lh = R.random_num(0.58, 0.78);
    const lw = R.random_num(0.38, 0.55);
    const vd = R.random_num(0.06, 0.16);
    const vh = lh - vd;
    const vw = R.random_num(0.12, 0.2);
    defs = [
      [[0,0],             [w*lw*.85,h*.15],          [-w*lw*.85,h*.15]],
      [[-w*lw,h*lh],      [-w*lw,h*(lh-.3)],         [-w*(lw-.1),h*(lh+.17)]],
      [[-w*vw,h*vh],      [-w*(vw+.13),h*(vh+.1)],   [-w*.05,h*(vh-.05)]],
      [[0,h],             [-w*.1,h*.85],              [w*.1,h*.85]],
      [[w*vw,h*vh],       [w*.05,h*(vh-.05)],         [w*(vw+.13),h*(vh+.1)]],
      [[w*lw,h*lh],       [w*(lw-.1),h*(lh+.17)],    [w*lw,h*(lh-.3)]],
    ];
  } else if (shape === 'drop') {
    const K = 0.5522847498;
    defs = [
      [[0, 0],          [w*.06, h*.04],        [-w*.06, h*.04]],
      [[-w/2, h-w/2],   [-w/2, h-w/2-w*.2],    [-w/2, h-w/2+w/2*K]],
      [[0, h],          [-w/2*K, h],            [w/2*K, h]],
      [[w/2, h-w/2],    [w/2, h-w/2+w/2*K],    [w/2, h-w/2-w*.2]],
    ];
  } else {
    const shapes = {
      pointy:      [[[0,0],[0,0],[-w/2,h*.3]],     [[0,h],[-w/2,h*.9],[w/2,h*.9]],     [[0,0],[w/2,h*.3],[0,0]]],
      exponential: [[[0,0],[0,0],[-w*.8,h*.3]],    [[0,h],[-w*.2,h*.8],[w*.2,h*.8]],   [[0,0],[w*.8,h*.3],[0,0]]],
      reverseExp:  [[[0,0],[0,0],[-w*.2,h*.3]],    [[0,h],[-w*.8,h*.8],[w*.8,h*.8]],   [[0,0],[w*.2,h*.3],[0,0]]],
      blade: [
        [[0,0],          [w*.1,h*.05],    [-w*.1,h*.05]],
        [[-w*.5,h],      [-w*.42,h*.55],  [-w*.2,h]],
        [[w*.5,h],       [w*.2,h],        [w*.42,h*.55]],
      ],
      trap:        [[[0,0],[0,0],[-w*.12,h*.5]],   [[0,h],[-w*.55,h*.72],[w*.55,h*.72]],[[0,0],[w*.12,h*.5],[0,0]]],
      trueHeart:   [[[0,0],[0,0],[-w/2,h*.5]],     [[0,h*.7],[-w/2,h*.95],[w/2,h*.95]],[[0,0],[w/2,h*.5],[0,0]]],
      sakura: [
        [[0,0],          [w*.5,h*.25],    [-w*.5,h*.25]],
        [[-w*.2,h],      [-w*.5,h*.8],    [-w*.08,h]],
        [[0,h*.82],      [-w*.08,h*.95],  [w*.08,h*.95]],
        [[w*.2,h],       [w*.08,h],       [w*.5,h*.8]],
      ],
      sakuraFull: [
        [[0,h*.02],      [w*.2,h*.02],    [-w*.2,h*.02]],
        [[-w*.52,h*.55], [-w*.42,h*.18],  [-w*.52,h*.85]],
        [[-w*.1,h],      [-w*.38,h],      [-w*.04,h]],
        [[0,h*.94],      [-w*.03,h*.98],  [w*.03,h*.98]],
        [[w*.1,h],       [w*.04,h],       [w*.38,h]],
        [[w*.52,h*.55],  [w*.52,h*.85],   [w*.42,h*.18]],
      ],
    };
    defs = shapes[shape] || shapes.pointy;
  }
  const out = [];
  const n = defs.length;
  for (let i = 0; i < n; i++) {
    const [co0,, hr0] = defs[i];
    const [co1, hl1]  = defs[(i+1) % n];
    out.push(...cubicBezier(co0, hr0, hl1, co1, steps));
  }
  return out;
}

function mergeVertices(geometry, tolerance) {
  tolerance = tolerance || 1e-4;
  const precision = Math.pow(10, Math.max(0, Math.log10(1 / tolerance)));
  const pos = geometry.attributes.position;
  const count = pos.count;
  const hashMap = {};
  const uniqueVerts = [];
  const indexRemap = new Int32Array(count);
  for (let i = 0; i < count; i++) {
    const key = Math.round(pos.getX(i)*precision)+'_'+Math.round(pos.getY(i)*precision)+'_'+Math.round(pos.getZ(i)*precision);
    if (hashMap[key] === undefined) { hashMap[key] = uniqueVerts.length; uniqueVerts.push([pos.getX(i),pos.getY(i),pos.getZ(i)]); }
    indexRemap[i] = hashMap[key];
  }
  const newPos = new Float32Array(uniqueVerts.length * 3);
  for (let i = 0; i < uniqueVerts.length; i++) { newPos[i*3]=uniqueVerts[i][0]; newPos[i*3+1]=uniqueVerts[i][1]; newPos[i*3+2]=uniqueVerts[i][2]; }
  const oldIdx = geometry.index ? geometry.index.array : null;
  const newIdx = new Uint16Array(oldIdx ? oldIdx.length : count);
  for (let i = 0; i < newIdx.length; i++) newIdx[i] = indexRemap[oldIdx ? oldIdx[i] : i];
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(newPos, 3));
  out.setIndex(Array.from(newIdx));
  return out;
}

function buildPetalGeometry(w, h, shape) {
  const outline = petalOutline(w, h, shape);
  const n = outline.length;

  const rings = [];
  for (let p = 0; p < N_PROFILE; p++) {
    const a      = -Math.PI/2 + Math.PI * p / (N_PROFILE - 1);
    const scaleXY = Math.cos(a);
    const z       = Math.sin(a) * PETAL_EXTRUDE * 0.5;
    rings.push(outline.map(([x, y]) => [x * scaleXY, y * scaleXY, z]));
  }

  const positions = [];
  const indices   = [];

  rings.forEach(ring => ring.forEach(([x,y,z]) => positions.push(x, y, z)));

  const vIdx = (ring, i) => ring * n + i;

  for (const [ri, rev] of [[0, false],[N_PROFILE-1, true]]) {
    const ring = rings[ri];
    const cx = ring.reduce((s,v) => s+v[0], 0) / n;
    const cy = ring.reduce((s,v) => s+v[1], 0) / n;
    const cz = ring[0][2];
    const ci = positions.length / 3;
    positions.push(cx, cy, cz);
    for (let i = 0; i < n; i++) {
      const j = (i+1) % n;
      if (rev) indices.push(ci, vIdx(ri,j), vIdx(ri,i));
      else     indices.push(ci, vIdx(ri,i), vIdx(ri,j));
    }
  }

  for (let p = 0; p < N_PROFILE - 1; p++) {
    for (let i = 0; i < n; i++) {
      const j  = (i+1) % n;
      const a  = vIdx(p,   i), b = vIdx(p,   j);
      const c  = vIdx(p+1, j), d = vIdx(p+1, i);
      indices.push(a, b, c,  a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  const merged = mergeVertices(geo, 1e-4);
  merged.computeVertexNormals();
  return merged;
}

function buildPetalOutlineGeometry(w, h, shape, tubeR) {
  const outline = petalOutline(w, h, shape);
  const n = outline.length;
  const S = 5;
  const positions = [];
  const indices   = [];

  for (let i = 0; i < n; i++) {
    const [x, y] = outline[i];
    const [nx, ny] = outline[(i + 1) % n];
    const [px, py] = outline[(i - 1 + n) % n];
    const tx = nx - px, ty = ny - py;
    const tl = Math.sqrt(tx*tx + ty*ty) || 1;
    const perpX = -ty / tl, perpY = tx / tl;
    for (let s = 0; s < S; s++) {
      const a = (Math.PI * 2 / S) * s;
      const offX = perpX * Math.cos(a) * tubeR;
      const offY = perpY * Math.cos(a) * tubeR;
      const offZ = Math.sin(a) * tubeR;
      positions.push(x + offX, y + offY, offZ);
    }
  }

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    for (let s = 0; s < S; s++) {
      const s2 = (s + 1) % S;
      const a = i * S + s, b = i * S + s2;
      const c = j * S + s2, d = j * S + s;
      indices.push(a, b, c, a, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function bakeVertexColors(geo, colA, colB) {
  const pos    = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const [r1,g1,b1] = hexToRGB(colA);
  const [r2,g2,b2] = hexToRGB(colB);

  let yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < yMin) yMin = y;
    if (y > yMax) yMax = y;
  }
  const yRange = Math.max(yMax - yMin, 0.0001);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let t = (y - yMin) / yRange;
    const nx = Math.floor(x * 80 + 1000);
    const ny = Math.floor(y * 80 + 1000);
    const h  = Math.sin(nx * 127.1 + ny * 311.7) * 43758.5453;
    const n  = (h - Math.floor(h) - 0.5) * 0.14;
    t = Math.max(0, Math.min(1, t + n * 0.4));

    colors[i*3]   = r1 + (r2-r1)*t + n*(r1+r2)*0.3;
    colors[i*3+1] = g1 + (g2-g1)*t + n*(g1+g2)*0.3;
    colors[i*3+2] = b1 + (b2-b1)*t + n*(b1+b2)*0.3;
    colors[i*3]   = Math.max(0, Math.min(1, colors[i*3]));
    colors[i*3+1] = Math.max(0, Math.min(1, colors[i*3+1]));
    colors[i*3+2] = Math.max(0, Math.min(1, colors[i*3+2]));
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}

function makeMat(roughness) {
  return new THREE.MeshStandardMaterial({
    vertexColors:    true,
    metalness:       1.0,
    roughness,
    envMapIntensity: 4.0,
    side:            THREE.DoubleSide,
  });
}

function makeCenterMat(hexColor, roughness) {
  const [r,g,b] = hexToRGB(hexColor);
  return new THREE.MeshStandardMaterial({
    color:           new THREE.Color(r,g,b),
    metalness:       1.0,
    roughness,
    envMapIntensity: 4.0,
  });
}

function applyHematiteEnv() {
  const envScene = new THREE.Scene();
  const sGeo = new THREE.SphereBufferGeometry(50, 64, 32);
  const sColors = [];
  const sPos = sGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const y = sPos.getY(i);
    const norm = (y + 50) / 100;
    sColors.push(0.08 + norm * 0.22, 0.08 + norm * 0.20, 0.10 + norm * 0.24);
  }
  sGeo.setAttribute('color', new THREE.Float32BufferAttribute(sColors, 3));
  envScene.add(new THREE.Mesh(sGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const patch = new THREE.Mesh(new THREE.SphereBufferGeometry(6, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  patch.position.set(20, 30, 25);
  envScene.add(patch);
  scene.environment = pmrem.fromScene(envScene).texture;
  renderer.toneMappingExposure = 1.4;
}

function generateFlower() {
  const root = new THREE.Group();

  const PALETTE_WEIGHTS = [
    ['pearl', 4.5],
    ['lapis_lazuli', 8.5],
    ['garnet', 7.5],
    ['azurite', 10.0],
    ['fire_opal', 9.0],
    ['chalcopyrite', 9.5],
    ['cobalt', 8.5],
    ['malachite', 9.0],
    ['citrine', 8.5],
    ['fluorite', 11.0],
    ['cinnabar', 9.0],
    ['hematite', 5.0],
  ];
  const _pw = R.random_dec() * 100;
  let _acc = 0, paletteName = PALETTE_WEIGHTS[0][0];
  for (const [name, weight] of PALETTE_WEIGHTS) {
    _acc += weight;
    if (_pw < _acc) { paletteName = name; break; }
  }

  const palDef       = COLOR_PALETTES[paletteName];
  const palette      = palDef.colors;

  const sakuraMode = R.random_bool(0.01);
  if (sakuraMode) {
    N_PROFILE = 16;
    STEPS_PER_SEG = 32;
    PETAL_EXTRUDE = 0.1;
    const mat = makeMat(0.04);
    mat.metalness = 0;
    mat.roughness = 0.6;
    mat.envMapIntensity = 1.0;
    mat.transparent = true;
    mat.opacity = 0.75;
    const _lum = hex => { const [r,g,b] = hexToRGB(hex); return 0.299*r + 0.587*g + 0.114*b; };
    const sorted = [...palette].sort((a,b) => _lum(a) - _lum(b));
    const colA = sorted[0];
    const colB = sorted[sorted.length - 1];
    const petalLength = MAX_PETAL_R * 0.75;
    const petalWidth  = MAX_PETAL_R * Math.sin(Math.PI / 5) * 2 * 0.48;
    const petalGeo = buildPetalGeometry(petalWidth, petalLength, 'sakuraFull');
    bakeVertexColors(petalGeo, colA, colB);

    const layerGroup = new THREE.Group();
    layerGroup.position.z = 0;
    layerGroup.userData.spinDir = R.random_choice([1, -1]);
    for (let j = 0; j < 5; j++) {
      const angle = (Math.PI * 2 / 5) * j;
      const mesh  = new THREE.Mesh(petalGeo, mat);
      mesh.rotation.z = angle;
      mesh.position.z = j * 0.005;
      layerGroup.add(mesh);
    }
    root.add(layerGroup);

    const _sca = hexToRGB(palette[palette.length - 1]);
    const _scb = hexToRGB(palette[palette.length - 2]);
    const pollenMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(_sca[0],_sca[1],_sca[2]), metalness: 1.0, roughness: 0.12, envMapIntensity: 4.0 });
    const stemMat   = new THREE.MeshStandardMaterial({ color: new THREE.Color(_scb[0],_scb[1],_scb[2]), metalness: 1.0, roughness: 0.12, envMapIntensity: 4.0 });
    const pollenR   = 0.04;
    const polGeo    = new THREE.IcosahedronBufferGeometry(pollenR, 2);
    const stamenZ   = LAYER_GAP * 0.5;
    const ringCounts = [R.random_int(10, 14), R.random_int(8, 12), R.random_int(5, 8), R.random_int(3, 5)];
    const ringRadii  = [petalLength * 0.35, petalLength * 0.25, petalLength * 0.15, petalLength * 0.07];
    for (let r = 0; r < 4; r++) {
      const ringOffset = r * Math.PI / ringCounts[r] * 0.7;
      for (let i = 0; i < ringCounts[r]; i++) {
        const angle = (Math.PI * 2 / ringCounts[r]) * i + ringOffset;
        const x = Math.cos(angle) * ringRadii[r];
        const y = Math.sin(angle) * ringRadii[r];
        const pz = stamenZ + r * pollenR * 1.5;
        const p = new THREE.Mesh(polGeo, pollenMat);
        p.position.set(x, y, pz);
        root.add(p);
        const dist = Math.sqrt(x*x + y*y);
        if (dist > 0.001) {
          const segs = 6;
          const curveMag = dist * 0.04;
          const segGeo = new THREE.CylinderBufferGeometry(0.006, 0.006, 1, 6);
          let px = 0, py = 0;
          for (let s = 0; s < segs; s++) {
            const t = (s + 1) / segs;
            const bend = Math.sin(t * Math.PI) * curveMag;
            const nx = Math.cos(angle) * dist * t + Math.cos(angle + Math.PI/2) * bend;
            const ny = Math.sin(angle) * dist * t + Math.sin(angle + Math.PI/2) * bend;
            const dx = nx - px, dy = ny - py;
            const segLen = Math.sqrt(dx*dx + dy*dy);
            const g = new THREE.Group();
            g.position.set((px+nx)/2, (py+ny)/2, pz);
            g.rotation.z = Math.atan2(dy, dx);
            const m = new THREE.Mesh(segGeo, stemMat);
            m.rotation.z = Math.PI / 2;
            m.scale.y = segLen;
            g.add(m);
            root.add(g);
            px = nx; py = ny;
          }
        }
      }
    }

    if (paletteName === 'hematite') applyHematiteEnv();

    const traits = {
      Palette: paletteName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      Form: 'Minimal',
      Body: 'Solid',
      Layers: 1,
      Petals: 'Sakura',
      Core: 'None',
      Stamen: 'Pollen',
      Parity: 'Odd',
    };

    return { root, numLayers: 1, layerGroups: [layerGroup], stamenAnim: null, traits, petalColors: [colA, colB] };
  }

  const parity       = R.random_choice(['even','odd']);
  const _layerRoll  = R.random_dec();
  const numLayers   = _layerRoll < 0.25 ? R.random_int(2, 3) : R.random_int(4, 10);
  const wireframe   = _layerRoll >= 0.20 && _layerRoll < 0.25;
  const outlineMode = _layerRoll >= 0.25 && _layerRoll < 0.28;

  const layerGroups = [];
  const mat = makeMat(0.04);
  if (wireframe) {
    mat.wireframe = true;
    N_PROFILE = 6;
    STEPS_PER_SEG = 10;
  } else {
    N_PROFILE = 8;
    STEPS_PER_SEG = 16;
    PETAL_EXTRUDE = 0.35;
  }

  const _useRandom = palDef.colorMode === 'random'
    || (palDef.colorMode === 'mixed' && R.random_bool(palDef.mixChance));

  const maxLen = MAX_PETAL_R;
  const minLen = maxLen * 0.3;

  const _shapeRoll = R.random_dec();
  const _spikyPool = ['pointy','spiky','exponential','reverseExp','trap','tri'];
  let shapePool, petalTrait;
  if (_shapeRoll < 0.05) {
    shapePool = ['blade'];
    petalTrait = 'Blade';
  } else if (_shapeRoll < 0.15) {
    const _pick = R.random_choice(['spiky','trap','trueHeart','sakura','tri','drop']);
    shapePool = [_pick];
    petalTrait = _pick === 'drop' ? 'Plush' : 'Wild';
  } else if (_shapeRoll < 0.45) {
    const _cat = [..._spikyPool];
    shapePool = [];
    for (let i = 0; i < 2; i++) {
      const idx = R.random_int(0, _cat.length - 1);
      shapePool.push(_cat.splice(idx, 1)[0]);
    }
    petalTrait = 'Wild';
  } else if (_shapeRoll < 0.55) {
    shapePool = ['oval','drop'];
    petalTrait = 'Plush';
  } else if (_shapeRoll < 0.90) {
    shapePool = _spikyPool;
    petalTrait = 'Wild';
  } else {
    shapePool = SHAPES;
    petalTrait = 'Wild';
  }

  const _centerRoll = R.random_dec();
  const centerMode  = paletteName === 'pearl' ? (_centerRoll < 0.5 ? 'normal' : 'small') : (_centerRoll < 0.2 ? 'none' : _centerRoll < 0.5 ? 'normal' : 'small');

  for (let l = 0; l < numLayers; l++) {
    let petals = R.random_bool(0.15) ? R.random_int(15, 19) : R.random_int(5, 14);
    if (parity === 'even' && petals % 2 !== 0) petals++;
    else if (parity === 'odd' && petals % 2 === 0) petals++;

    const t           = l / Math.max(numLayers - 1, 1);
    let   petalLength = maxLen - (maxLen - minLen) * t;
    if (l === numLayers - 1 && centerMode === 'none') {
      petalLength *= R.random_num(0.5, 0.65);
    }
    const _maxWidth = petals <= 7  ? 120 :
                      petals <= 10 ? 100 :
                      petals <= 13 ? 80  :
                      petals <= 16 ? 65  : 55;
    let   petalWidth  = R.random_num(40, _maxWidth) * WORLD_SCALE;

    if (l === numLayers - 1) {
      const maxSafe = petalLength * Math.sin(Math.PI / petals) * 0.85;
      petalWidth = Math.min(petalWidth, maxSafe);
    }

    const shape         = R.random_choice(shapePool);
    const layerZ        = l * LAYER_GAP;
    const layerRotation = l * (Math.PI / petals);
    let colA, colB;
    if (_useRandom) {
      const _idxA = R.random_int(0, palette.length - 1);
      let _idxB = R.random_int(0, palette.length - 2);
      if (_idxB >= _idxA) _idxB++;
      colA = palette[_idxA];
      colB = palette[_idxB];
    } else {
      colA = palette[l % palette.length];
      colB = palette[(l + 1) % palette.length];
    }
    const spinDir       = l % 2 === 0 ? 1 : -1;

    const petalGeo = outlineMode
      ? buildPetalOutlineGeometry(petalWidth, petalLength, shape, 0.005)
      : buildPetalGeometry(petalWidth, petalLength, shape);
    bakeVertexColors(petalGeo, colA, colB);

    const layerGroup = new THREE.Group();
    layerGroup.position.z = layerZ;
    layerGroup.userData.spinDir = spinDir;

    for (let j = 0; j < petals; j++) {
      const angle = (Math.PI * 2 / petals) * j + layerRotation;
      const mesh  = new THREE.Mesh(petalGeo, mat);
      mesh.rotation.z    = angle;
      mesh.position.z    = j * 0.005;

      layerGroup.add(mesh);
    }

    root.add(layerGroup);
    layerGroups.push(layerGroup);
  }

  const _baseSize   = R.random_num(0.04, 0.12) * 1000 * WORLD_SCALE;
  const centerSize  = centerMode === 'small' ? _baseSize * 0.3 : _baseSize;
  const _centerPalette = paletteName === 'hematite' ? [palette[2]] : [palette[0], palette[palette.length-1]];
  const centerHex   = R.random_choice(_centerPalette);
  const centerMat   = makeCenterMat(centerHex, 0.4);
  if (wireframe) centerMat.wireframe = true;
  const centerGeo   = outlineMode
    ? new THREE.TorusBufferGeometry(centerSize / 2, 0.004, 6, 32)
    : wireframe
      ? new THREE.IcosahedronBufferGeometry(centerSize / 2, 4)
      : new THREE.SphereBufferGeometry(centerSize / 2, 48, 32);
  const centerMesh  = new THREE.Mesh(centerGeo, centerMat);
  const topZ        = (numLayers + 1) * LAYER_GAP;
  centerMesh.position.z = topZ;
  if (centerMode !== 'none') root.add(centerMesh);

  let stamenAnim = null;
  let _stamenTrait = 'None';
  const showStamen = R.random_bool(0.8);
  if (showStamen) {
    const stamenZ = centerMode === 'none'
      ? (numLayers - 1.5) * LAYER_GAP
      : numLayers * LAYER_GAP;
    const stemInner = centerMode === 'none' ? 0 : centerSize / 2;
    const minReach  = minLen * R.random_num(0.5, 0.8);
    const _sca = hexToRGB(paletteName === 'lapis_lazuli' ? '#c8a840' : palette[palette.length - 1]);
    const _scb = hexToRGB(paletteName === 'lapis_lazuli' ? '#b09030' : palette[palette.length - 2]);
    const matA = new THREE.MeshStandardMaterial({ color: new THREE.Color(_sca[0],_sca[1],_sca[2]), metalness: 1.0, roughness: 0.12, envMapIntensity: 4.0 });
    const matB = new THREE.MeshStandardMaterial({ color: new THREE.Color(_scb[0],_scb[1],_scb[2]), metalness: 1.0, roughness: 0.12, envMapIntensity: 4.0 });
    if (wireframe) { matA.wireframe = true; matB.wireframe = true; }

    const _stamenRoll = R.random_dec();
    const _isBubbly = (shapePool.length === 2 && shapePool[0] === 'oval' && shapePool[1] === 'drop')
      || (shapePool.length === 1 && BUBBLY_SHAPES.includes(shapePool[0]));
    const _twirlsOk = numLayers <= 3 || _isBubbly;
    let stamenType = _stamenRoll < 0.405 ? 'og'
      : _stamenRoll < 0.64 ? 'sticks'
      : _stamenRoll < 0.74 ? 'messy'
      : _stamenRoll < 0.895 ? 'twirls'
      : 'zinnia';
    if ((stamenType === 'twirls' && !_twirlsOk) || (stamenType === 'zinnia' && centerMode === 'none')) stamenType = 'og';
    const _stamenNames = { sticks: 'Anther', messy: 'Messy', twirls: 'Tendril', zinnia: 'Zinnia' };
    _stamenTrait = _stamenNames[stamenType] || stamenType;

    if (stamenType === 'og') {
      const numSticks  = R.random_int(8, 19);
      const slen       = Math.max(centerSize * R.random_num(1.2, 2), minReach);
      const showPollen = R.random_bool(0.7);
      _stamenTrait = showPollen ? 'Pollen' : 'Filament';
      const pollenR    = 0.05;
      const stemLen    = slen - stemInner;
      const stemGeo    = new THREE.CylinderBufferGeometry(0.008, 0.008, stemLen, 6);
      const polGeo = showPollen
        ? (outlineMode
          ? new THREE.TorusBufferGeometry(pollenR, 0.003, 6, 16)
          : new THREE.IcosahedronBufferGeometry(pollenR, 2))
        : null;
      const midR = (stemInner + slen) / 2;
      for (let i = 0; i < numSticks; i++) {
        const angle = (Math.PI * 2 / numSticks) * i;
        const g = new THREE.Group();
        g.position.set(Math.cos(angle) * midR, Math.sin(angle) * midR, stamenZ);
        g.rotation.z = angle;
        const m = new THREE.Mesh(stemGeo, matB);
        m.rotation.z = Math.PI / 2;
        g.add(m);
        root.add(g);
        if (showPollen) {
          const p = new THREE.Mesh(polGeo, matA);
          p.position.set(Math.cos(angle) * slen, Math.sin(angle) * slen, stamenZ + pollenR * 0.6);
          root.add(p);
        }
      }

    } else if (stamenType === 'sticks') {
      const numSticks  = R.random_int(6, 12);
      const slen       = Math.max(centerSize * R.random_num(1.5, 3.0), minReach);
      const antherLen  = R.random_num(0.06, 0.14);
      const antherGeo  = outlineMode
        ? new THREE.TorusBufferGeometry(1, 0.15, 6, 16)
        : new THREE.IcosahedronBufferGeometry(1, 2);
      const stemLen    = slen - stemInner;
      const stemGeo    = new THREE.CylinderBufferGeometry(0.005, 0.005, stemLen, 6);
      const midR = (stemInner + slen) / 2;
      for (let i = 0; i < numSticks; i++) {
        const angle = (Math.PI * 2 / numSticks) * i;
        const g = new THREE.Group();
        g.position.set(Math.cos(angle) * midR, Math.sin(angle) * midR, stamenZ);
        g.rotation.z = angle;
        const m = new THREE.Mesh(stemGeo, matB);
        m.rotation.z = Math.PI / 2;
        g.add(m);
        root.add(g);
        const anther = new THREE.Mesh(antherGeo, matA);
        anther.scale.set(0.018, antherLen / 2, 0.013);
        anther.position.set(Math.cos(angle) * slen, Math.sin(angle) * slen, stamenZ + 0.01);
        anther.rotation.z = angle + R.random_num(-0.8, 0.8);
        anther.rotation.x = R.random_num(0.1, 1.2);
        anther.rotation.y = R.random_num(-0.4, 0.4);
        root.add(anther);
      }

    } else if (stamenType === 'zinnia') {
      const numDots  = R.random_int(10, 18);
      const podGeo   = outlineMode
        ? new THREE.TorusBufferGeometry(1, 0.15, 6, 16)
        : new THREE.IcosahedronBufferGeometry(1, 2);
      const lobeLen  = R.random_num(0.06, 0.1);
      const lobeW    = lobeLen * R.random_num(0.25, 0.4);
      const ringR    = centerSize / 2 + lobeLen * 0.55;
      const numLobes = 5;
      for (let i = 0; i < numDots; i++) {
        const angle = (Math.PI * 2 / numDots) * i;
        const x = Math.cos(angle) * ringR, y = Math.sin(angle) * ringR;
        const baseRot  = R.random_num(0, Math.PI * 2);
        for (let a = 0; a < numLobes; a++) {
          const la = baseRot + (Math.PI * 2 / numLobes) * a;
          const lx = x + Math.cos(la) * lobeLen * 0.5;
          const ly = y + Math.sin(la) * lobeLen * 0.5;
          const lobe = new THREE.Mesh(podGeo, matA);
          lobe.scale.set(lobeLen * 0.5, lobeW * 0.5, lobeW * 0.35);
          lobe.position.set(lx, ly, stamenZ + lobeW * 0.4);
          lobe.rotation.z = la;
          root.add(lobe);
        }
      }

    } else if (stamenType === 'messy') {
      const numSticks = R.random_int(30, 50);
      const baseLen   = Math.max(centerSize * R.random_num(2.0, 4.0), minReach);
      const messySticks = [];
      for (let i = 0; i < numSticks; i++) {
        const angle  = R.random_num(0, Math.PI * 2);
        const lenMul = R.random_num(0.4, 1.0);
        const slen   = baseLen * lenMul;
        const x1 = Math.cos(angle) * stemInner, y1 = Math.sin(angle) * stemInner;
        const stemLen = slen - stemInner;
        const thick   = R.random_num(0.003, 0.007);
        const stemGeo = new THREE.CylinderBufferGeometry(thick, thick, 1, 4);
        const g = new THREE.Group();
        g.position.set(x1, y1, stamenZ);
        g.rotation.z = angle;
        const m = new THREE.Mesh(stemGeo, matB);
        m.rotation.z = Math.PI / 2;
        m.scale.y = stemLen;
        m.position.x = stemLen / 2;
        g.add(m);
        root.add(g);
        messySticks.push({ mesh: m, baseScale: stemLen, parity: i % 2 });
      }
      stamenAnim = { type: 'messy', sticks: messySticks };

    } else if (stamenType === 'twirls') {
      const twirlGroup = new THREE.Group();
      const numTwirls = R.random_int(6, 12);
      const slen      = Math.max(centerSize * R.random_num(1.5, 2.5), minReach);
      const curlTight = R.random_num(1.5, 3.0);
      const curlAmp   = R.random_num(0.08, 0.2);
      const pollenR   = 0.04;
      const polGeo    = outlineMode
        ? new THREE.TorusBufferGeometry(pollenR, 0.003, 6, 16)
        : new THREE.IcosahedronBufferGeometry(pollenR, 2);
      const segs      = 32;
      const segGeo    = new THREE.CylinderBufferGeometry(0.005, 0.005, 1, 5);
      for (let i = 0; i < numTwirls; i++) {
        const baseAngle = (Math.PI * 2 / numTwirls) * i;
        let px = Math.cos(baseAngle) * stemInner;
        let py = Math.sin(baseAngle) * stemInner;
        for (let s = 0; s < segs; s++) {
          const t  = (s + 1) / segs;
          const r  = stemInner + (slen - stemInner) * t;
          const curl = Math.sin(t * curlTight * Math.PI) * curlAmp * t;
          const nx = Math.cos(baseAngle + curl) * r;
          const ny = Math.sin(baseAngle + curl) * r;
          const dx = nx - px, dy = ny - py;
          const segLen = Math.sqrt(dx*dx + dy*dy);
          const g = new THREE.Group();
          g.position.set((px+nx)/2, (py+ny)/2, stamenZ);
          g.rotation.z = Math.atan2(dy, dx);
          const m = new THREE.Mesh(segGeo, matB);
          m.rotation.z = Math.PI / 2;
          m.scale.y = segLen;
          g.add(m);
          twirlGroup.add(g);
          px = nx; py = ny;
        }
        const p = new THREE.Mesh(polGeo, matA);
        p.position.set(px, py, stamenZ + pollenR * 0.6);
        twirlGroup.add(p);
      }
      root.add(twirlGroup);
      stamenAnim = { type: 'twirls', group: twirlGroup };
    }
  }

  if (paletteName === 'hematite') applyHematiteEnv();

  const traits = {
    Palette: paletteName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    Form: numLayers <= 3 ? 'Minimal' : 'Flore Pleno',
    Body: wireframe ? 'Wire' : outlineMode ? 'Trace' : 'Solid',
    Layers: numLayers,
    Petals: petalTrait,
    Core: centerMode === 'none' ? 'None' : centerMode === 'small' ? 'Small' : 'Normal',
    Stamen: _stamenTrait,
    Parity: parity.charAt(0).toUpperCase() + parity.slice(1),
  };

  return { root, numLayers, layerGroups, stamenAnim, traits, petalColors: null };
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const SUPERSAMPLE = 1.6;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * SUPERSAMPLE);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.width  = window.innerWidth + 'px';
renderer.domElement.style.height = window.innerHeight + 'px';
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
const scene  = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
(function buildEnvMap() {
  const envScene = new THREE.Scene();
  const sGeo = new THREE.SphereBufferGeometry(50, 64, 32);
  const sColors = [];
  const sPos = sGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const y = sPos.getY(i);
    const norm = (y + 50) / 100;
    const r = 0.04 + norm * 0.18;
    const g = 0.04 + norm * 0.16;
    const b = 0.08 + norm * 0.28;
    sColors.push(r, g, b);
  }
  sGeo.setAttribute('color', new THREE.Float32BufferAttribute(sColors, 3));
  const sMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  envScene.add(new THREE.Mesh(sGeo, sMat));

  const patchGeo = new THREE.SphereBufferGeometry(6, 16, 16);
  const patchMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const patch = new THREE.Mesh(patchGeo, patchMat);
  patch.position.set(20, 30, 25);
  envScene.add(patch);

  const warmGeo = new THREE.SphereBufferGeometry(2, 16, 16);
  const warmMat = new THREE.MeshBasicMaterial({ color: 0xcc6622 });
  const warm = new THREE.Mesh(warmGeo, warmMat);
  warm.position.set(-25, -20, 15);
  envScene.add(warm);

  const coolGeo = new THREE.SphereBufferGeometry(3, 16, 16);
  const coolMat = new THREE.MeshBasicMaterial({ color: 0x6699ff });
  const cool = new THREE.Mesh(coolGeo, coolMat);
  cool.position.set(-30, 20, 20);
  envScene.add(cool);

  const envTex = pmrem.fromScene(envScene).texture;
  scene.environment = envTex;
})();

const ambient = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xffffff, 2.5);
key.position.set(3, 4, 8);
scene.add(key);

const fill = new THREE.DirectionalLight(0x8899cc, 0.8);
fill.position.set(-4, -3, 5);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xcc8844, 0.6);
rim.position.set(0, -6, 2);
scene.add(rim);

const camera = new THREE.PerspectiveCamera(
  40,
  window.innerWidth / window.innerHeight,
  0.01,
  1000
);
const fovHalf = 20 * Math.PI / 180;

const { root, numLayers, layerGroups, stamenAnim, traits, petalColors } = generateFlower();

scene.background = null;

renderer.domElement.style.filter = 'contrast(1.45)';

scene.add(root);

const midZ = ((numLayers + 1) * LAYER_GAP) / 2;
root.position.z = -midZ;

const _aspect = window.innerWidth / window.innerHeight;
const _fovAdj = _aspect < 1
  ? Math.atan(Math.tan(fovHalf) * _aspect)
  : fovHalf;
const camZ = (MAX_PETAL_R * 1.05) / Math.tan(_fovAdj);
camera.position.set(0, 0, camZ);
camera.lookAt(0, 0, 0);

const _speedRoll = R.random_dec();
const BASE_SPEED  = _speedRoll < 0.20 ? 0.0005 : _speedRoll < 0.30 ? 0.007 : 0.0025;
traits.Tempo = _speedRoll < 0.20 ? '-8%' : _speedRoll < 0.30 ? '+8%' : '0%';
window.tokenTraits = traits;

(function buildStaticNoise() {
  let _ns = parseInt(tokenData.hash.substring(2, 10), 16);
  function seededRand() {
    _ns ^= _ns << 13; _ns ^= _ns >> 17; _ns ^= _ns << 5;
    return ((_ns < 0 ? ~_ns + 1 : _ns) % 10000) / 10000;
  }
  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = seededRand();
    while (v === 0) v = seededRand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
 
  const w = window.innerWidth;
  const h = window.innerHeight;
 
  function makeNoiseCanvas(blendMode, opacity, fillFn) {
    const c = document.createElement('canvas');
    c.style.position     = 'fixed';
    c.style.top          = '0';
    c.style.left         = '0';
    c.style.width        = '100%';
    c.style.height       = '100%';
    c.style.pointerEvents = 'none';
    c.style.zIndex       = '999';
    c.style.opacity      = String(opacity);
    c.style.mixBlendMode = blendMode;
    c.width  = w;
    c.height = h;
    document.body.appendChild(c);
    const ctx = c.getContext('2d');
    const id  = ctx.createImageData(w, h);
    const d   = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = fillFn();
      d[i] = d[i+1] = d[i+2] = v;
      d[i+3] = 255;
    }
    ctx.putImageData(id, 0, 0);
    return c;
  }
 
  makeNoiseCanvas('screen', 0.15, () =>
    Math.max(0, Math.min(255, Math.round(128 + gaussian() * 55)))
  );
 
  makeNoiseCanvas('multiply', 0.18, () =>
    Math.max(0, Math.min(255, Math.round(255 - Math.abs(gaussian() * 55))))
  );
})();

if (traits.Petals === 'Sakura') {
  const fallingPetals = [];
  const _fpOutline = petalOutline(0.08, 0.12, 'sakuraFull', 8);
  const _fpShape = new THREE.Shape();
  _fpShape.moveTo(_fpOutline[0][0], _fpOutline[0][1]);
  for (let i = 1; i < _fpOutline.length; i++) _fpShape.lineTo(_fpOutline[i][0], _fpOutline[i][1]);
  _fpShape.closePath();
  const petalGeoSmall = new THREE.ShapeBufferGeometry(_fpShape);
  const _fpPos = petalGeoSmall.attributes.position;
  let _fpYMin = Infinity, _fpYMax = -Infinity;
  for (let i = 0; i < _fpPos.count; i++) {
    const y = _fpPos.getY(i);
    if (y < _fpYMin) _fpYMin = y;
    if (y > _fpYMax) _fpYMax = y;
  }
  const _fpRange = _fpYMax - _fpYMin || 1;
  for (let i = 0; i < _fpPos.count; i++) {
    const t = (_fpPos.getY(i) - _fpYMin) / _fpRange;
    _fpPos.setZ(i, t * t * 0.03);
  }
  bakeVertexColors(petalGeoSmall, petalColors[0], petalColors[1]);
  petalGeoSmall.computeVertexNormals();
  const petalMatSmall = new THREE.MeshStandardMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    metalness: 0,
    roughness: 0.7,
    transparent: true,
    opacity: 0.5,
  });
  const spawnStart = performance.now() + 5000;
  let lastSpawn = 0;
 
  (function animatePetals() {
    requestAnimationFrame(animatePetals);
    const now = performance.now();
    if (now < spawnStart) return;
 
    if (now - lastSpawn > 400) {
      lastSpawn = now;
      const pz = camZ * (0.3 + R.random_dec() * 0.4);
      const dist = camZ - pz;
      const halfH = dist * Math.tan(20 * Math.PI / 180);
      const halfW = halfH * (window.innerWidth / window.innerHeight);
      const m = new THREE.Mesh(petalGeoSmall, petalMatSmall);
      m.position.set(halfW * 1.2, halfH * (0.5 + R.random_dec() * 0.7), pz);
      m.rotation.set(R.random_dec() * Math.PI * 2, R.random_dec() * Math.PI * 2, R.random_dec() * Math.PI * 2);
      m.userData.vel = { x: -(0.006 + R.random_dec() * 0.004), y: -(0.003 + R.random_dec() * 0.003) };
      m.userData.spin = { x: (R.random_dec() - 0.5) * 0.03, y: (R.random_dec() - 0.5) * 0.03, z: (R.random_dec() - 0.5) * 0.02 };
      m.userData.halfW = halfW;
      scene.add(m);
      fallingPetals.push(m);
    }
 
    for (let i = fallingPetals.length - 1; i >= 0; i--) {
      const p = fallingPetals[i];
      p.position.x += p.userData.vel.x;
      p.position.y += p.userData.vel.y;
      p.rotation.x += p.userData.spin.x;
      p.rotation.y += p.userData.spin.y;
      p.rotation.z += p.userData.spin.z;
      if (p.position.x < -p.userData.halfW * 1.3 || p.position.y < -p.userData.halfW) {
        scene.remove(p);
        fallingPetals.splice(i, 1);
      }
    }
  })();
}
 
let _animPaused = false;

function _animate() {
  if (!_animPaused) requestAnimationFrame(_animate);
  const t = performance.now() * 0.001;
  layerGroups.forEach((g, i) => {
    const speed = BASE_SPEED * (1 + i * 0.04);
    g.rotation.z += g.userData.spinDir * speed;
  });
 
  if (stamenAnim) {
    if (stamenAnim.type === 'messy') {
      const pulse = Math.sin(t * 0.6) * 0.12;
      stamenAnim.sticks.forEach(s => {
        const len = s.baseScale * (1 + (s.parity === 0 ? pulse : -pulse));
        s.mesh.scale.y = len;
        s.mesh.position.x = len / 2;
      });
    } else if (stamenAnim.type === 'twirls') {
      stamenAnim.group.rotation.z += 0.001;
    }
  }

  renderer.render(scene, camera);
}
_animate();

window.enicollTogglePause = () => {
  _animPaused = !_animPaused;
  if (!_animPaused) _animate();
  return _animPaused;
};

// --- DEV TOOLS: Screenshot (S) and Video Record (V) ---
// Remove this entire block before Art Blocks submission
(function devCapture() {
  const CAPTURE_W      = window.CAPTURE_W      || 4000;
  const CAPTURE_H      = window.CAPTURE_H      || 5000;
  const VIDEO_DURATION = window.VIDEO_DURATION || 10;
  const VIDEO_FPS = 60;
  const VIDEO_BITRATE = 12000000;
  window.addEventListener('keydown', e => {
    if (e.key === 'n' || e.key === 'N') {
      document.querySelectorAll('canvas').forEach(c => {
        if (c !== renderer.domElement && c.style.mixBlendMode) {
          c.style.display = c.style.display === 'none' ? '' : 'none';
        }
      });
      console.log('Noise toggled');
    }
  });

function compositeFrame(outCanvas) {
    const ctx = outCanvas.getContext('2d');
    const cw = outCanvas.width, ch = outCanvas.height;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);
    ctx.filter = 'contrast(1.45)';
    if (window.ZOOM_SCALE && window.ZOOM_SCALE > 0) {
      const s  = window.ZOOM_SCALE;
      const sw = cw * s, sh = ch * s;
      ctx.drawImage(renderer.domElement, -(sw - cw) / 2, -(sh - ch) / 2, sw, sh);
    } else {
      ctx.drawImage(renderer.domElement, 0, 0, cw, ch);
    }
    ctx.filter = 'none';
    const noiseCanvases = document.querySelectorAll('canvas');
    noiseCanvases.forEach(nc => {
      if (nc === renderer.domElement || nc === outCanvas) return;
      const blend = nc.style.mixBlendMode;
      const opacity = parseFloat(nc.style.opacity);
      if (blend && opacity && nc.style.display !== 'none') {
        ctx.globalCompositeOperation = blend;
        ctx.globalAlpha = opacity;
        ctx.drawImage(nc, 0, 0, cw, ch);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
    });
  }

  function setCaptureCamera() {
    camera.aspect = CAPTURE_W / CAPTURE_H;
    const capFov = camera.aspect < 1
      ? Math.atan(Math.tan(fovHalf) * camera.aspect)
      : fovHalf;
    camera.position.z = (MAX_PETAL_R * 1.05) / Math.tan(capFov);
    camera.updateProjectionMatrix();
  }

  function restoreCamera() {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) * SUPERSAMPLE);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.domElement.style.width = window.innerWidth + 'px';
    renderer.domElement.style.height = window.innerHeight + 'px';
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.position.z = camZ;
    camera.updateProjectionMatrix();
  }

  function takeScreenshot() {
    renderer.setPixelRatio(1);
    renderer.setSize(CAPTURE_W, CAPTURE_H);
    setCaptureCamera();
    renderer.render(scene, camera);

    const out = document.createElement('canvas');
    out.width = CAPTURE_W;
    out.height = CAPTURE_H;
    compositeFrame(out);

    restoreCamera();

    out.toBlob(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'geophylla_' + (tokenData.tokenId || tokenData.hash.substring(2, 10)) + '.png';
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
    console.log('Screenshot saved at ' + CAPTURE_W + 'x' + CAPTURE_H);
  }

  let recording = false;
  function recordVideo() {
    if (recording) return;
    recording = true;

    // Stop the live animation loop — captureFrame owns all scene updates
    _animPaused = true;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width  = CAPTURE_W;
    captureCanvas.height = CAPTURE_H;

    // Detect best supported codec
    const _mimeTypes = [
      'video/mp4;codecs=avc1', 'video/mp4',
      'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm',
    ];
    const _mimeType = _mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
    const _ext = _mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';

    const stream = captureCanvas.captureStream(VIDEO_FPS);
    const recorder = new MediaRecorder(stream, {
      mimeType: _mimeType,
      videoBitsPerSecond: VIDEO_BITRATE,
    });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: _mimeType });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'geophylla_' + (tokenData.tokenId || tokenData.hash.substring(2, 10)) + '.' + _ext;
      a.click();
      URL.revokeObjectURL(a.href);
      recording = false;

      restoreCamera();
      // Resume live animation
      _animPaused = false;
      _animate();
      console.log('Video saved as ' + _ext + ' (' + (blob.size / 1024 / 1024).toFixed(1) + 'MB)');
    };

    // Resize renderer for hi-res capture (this will affect the live canvas,
    // but _animate is paused so the user only sees a frozen frame while recording)
    renderer.setPixelRatio(1);
    renderer.setSize(CAPTURE_W, CAPTURE_H);
    setCaptureCamera();

    const totalFrames = VIDEO_DURATION * VIDEO_FPS;
    let frame = 0;

    function captureFrame() {
      if (frame >= totalFrames) {
        recorder.stop();
        return;
      }
      // captureFrame is now the only thing advancing the scene
      const t = frame / VIDEO_FPS; // deterministic time, not performance.now()
      layerGroups.forEach((g, i) => {
        const speed = BASE_SPEED * (1 + i * 0.04);
        g.rotation.z += g.userData.spinDir * speed;
      });
      if (stamenAnim) {
        if (stamenAnim.type === 'messy') {
          const pulse = Math.sin(t * 0.6) * 0.12;
          stamenAnim.sticks.forEach(s => {
            const len = s.baseScale * (1 + (s.parity === 0 ? pulse : -pulse));
            s.mesh.scale.y = len;
            s.mesh.position.x = len / 2;
          });
        } else if (stamenAnim.type === 'twirls') {
          stamenAnim.group.rotation.z += 0.001;
        }
      }
      renderer.render(scene, camera);
      compositeFrame(captureCanvas);
      frame++;
      requestAnimationFrame(captureFrame);
    }
    // Render warmup frames so Three.js fully settles at the new
    // resolution and camera projection before any frames hit the stream.
    const WARMUP_FRAMES = 8;
    let warmup = WARMUP_FRAMES;

    function warmupThenRecord() {
      renderer.render(scene, camera);
      if (--warmup > 0) {
        requestAnimationFrame(warmupThenRecord);
      } else {
        recorder.start();
        captureFrame();
      }
    }
    warmupThenRecord();
  }

  window.addEventListener('keydown', e => {
    if (e.key === 's' || e.key === 'S') takeScreenshot();
    if (e.key === 'v' || e.key === 'V') recordVideo();
  });

  window.enicollDownloadStill = takeScreenshot;
  window.enicollStartVideo    = recordVideo;
  console.log('Dev capture ready: S = screenshot (2160x2160 PNG), V = record (10s WebM)');
})();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.width  = window.innerWidth + 'px';
  renderer.domElement.style.height = window.innerHeight + 'px';
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});