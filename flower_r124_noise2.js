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
const PETAL_EXTRUDE = 0.35;
const LAYER_GAP     = 0.6;
const N_PROFILE     = 8;
const STEPS_PER_SEG = 16;
const SHAPES = ['oval','pointy','spiky','exponential','looped','heart','trueHeart'];

const COLOR_PALETTES = {
  pearl:           ['#f5c8d0','#f9dde3','#fff8f9','#fffff0','#fffde8','#ddf0fd','#ffffff'],
  lapis_lazuli:   ['#050510','#080e35','#0a1450','#0e1e78','#1840c8','#c8d8ff'],
  garnet:         ['#0a0005','#280008','#3d1505','#500010','#880018','#c02020'],
  azurite:        ['#05050f','#1a1a4a','#2a3aaa','#6a4a9a','#00e5c0','#e8820a'],
  fire_opal:     ['#050000','#4a0a05','#8a1a10','#c8302a','#ff6600','#c8b030'],
  chalcopyrite:    ['#1a3a4a','#5a3010','#9a5020','#5a9aaa','#8ab8c8'],
  cobalt:  ['#02020f','#0a0a4a','#2a3ab0','#4a6acc','#8a3a1a'],
  malachite:      ['#020a04','#082010','#0c4820','#0a8030','#00b844','#00e855'],
  hematite:      ['#111111','#2a2a2a','#555555','#909090','#d4d4d4','#ffffff'],
  citrine:       ['#ff3d00','#ff7a00','#ffa800','#ffd000','#ffee58'],
  fluorite:         ['#020810','#0a2a3a','#a8e8d8','#0a6860','#a060c8','#ffe680','#e8c8f8'],
  cinnabar:      ['#080408','#280818','#781838','#d04060','#e89030','#f8d060'],
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
    const K = 0.5522847498;
    const [cx,cy,rx,ry] = [0, h/2, w/2, h/2];
    defs = [
      [[cx,    cy+ry], [cx-rx*K, cy+ry  ], [cx+rx*K, cy+ry  ]],
      [[cx+rx, cy   ], [cx+rx,   cy+ry*K], [cx+rx,   cy-ry*K]],
      [[cx,    cy-ry], [cx+rx*K, cy-ry  ], [cx-rx*K, cy-ry  ]],
      [[cx-rx, cy   ], [cx-rx,   cy-ry*K], [cx-rx,   cy+ry*K]],
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
  } else {
    const shapes = {
      pointy:      [[[0,0],[0,0],[-w/2,h*.3]],     [[0,h],[-w/2,h*.9],[w/2,h*.9]],     [[0,0],[w/2,h*.3],[0,0]]],
      exponential: [[[0,0],[0,0],[-w*.8,h*.3]],    [[0,h],[-w*.2,h*.8],[w*.2,h*.8]],   [[0,0],[w*.8,h*.3],[0,0]]],
      looped:      [[[0,0],[0,0],[-w*.5,h*.2]],    [[0,h],[-w*.2,h*.9],[w*.6,h*.6]],   [[0,0],[w*.3,h*.1],[0,0]]],
      heart:       [[[0,0],[0,0],[-w/2,h*.4]],     [[0,h],[-w*.1,h*.9],[w*.1,h*.9]],   [[0,0],[w/2,h*.4],[0,0]]],
      trueHeart:   [[[0,0],[0,0],[-w/2,h*.5]],     [[0,h*.7],[-w/2,h*.95],[w/2,h*.95]],[[0,0],[w/2,h*.5],[0,0]]],
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

function makeMat(roughness = 0.08) {
  return new THREE.MeshStandardMaterial({
    vertexColors:    true,
    metalness:       1.0,
    roughness,
    envMapIntensity: 4.0,
    side:            THREE.DoubleSide,
  });
}

function makeCenterMat(hexColor, roughness = 0.4) {
  const [r,g,b] = hexToRGB(hexColor);
  return new THREE.MeshStandardMaterial({
    color:           new THREE.Color(r,g,b),
    metalness:       1.0,
    roughness,
    envMapIntensity: 4.0,
  });
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
    ['fluorite', 10.0],
    ['cinnabar', 9.0],
    ['hematite', 5.0],
    ['black_and_white', 1.0],
  ];
  const _pw = R.random_dec() * 100;
  let _acc = 0, paletteName = PALETTE_WEIGHTS[0][0];
  for (const [name, weight] of PALETTE_WEIGHTS) {
    _acc += weight;
    if (_pw < _acc) { paletteName = name; break; }
  }

  const isMonochrome = (paletteName === 'black_and_white');
  const _basePalette = COLOR_PALETTES[isMonochrome ? 'hematite' : paletteName];
  const palette      = isMonochrome ? [..._basePalette].reverse() : _basePalette;
  const parity       = R.random_choice(['even','odd']);
  const numLayers     = isMonochrome ? R.random_int(8, 10) : (R.random_bool(0.2) ? R.random_int(2, 3) : R.random_int(4, 10));

  const layerGroups = [];
  const mat = makeMat(0.04);

  const _useRandom = paletteName === 'lapis_lazuli' || paletteName === 'garnet'
    || paletteName === 'malachite'
    || (paletteName === 'azurite' && R.random_bool(0.4))
    || (paletteName === 'citrine' && R.random_bool(0.4));

  for (let l = 0; l < numLayers; l++) {
    let petals = R.random_bool(0.15) ? R.random_int(15, 19) : R.random_int(5, 14);
    if (parity === 'even' && petals % 2 !== 0) petals++;
    else if (parity === 'odd' && petals % 2 === 0) petals++;

    const maxLen      = 1000 * 0.45 * WORLD_SCALE;
    const minLen      = maxLen * 0.3;
    const t           = l / Math.max(numLayers - 1, 1);
    const petalLength = maxLen - (maxLen - minLen) * t;
    const _maxWidth = petals <= 7  ? 120 :
                      petals <= 10 ? 100 :
                      petals <= 13 ? 80  :
                      petals <= 16 ? 65  : 55;
    let   petalWidth  = R.random_num(40, _maxWidth) * WORLD_SCALE;

    if (l === numLayers - 1) {
      const maxSafe = 2 * (petalLength * 0.5) * Math.sin(Math.PI / petals) * 0.85;
      petalWidth = Math.min(petalWidth, maxSafe);
    }

    const shape         = R.random_choice(SHAPES);
    const layerZ        = l * LAYER_GAP;
    const layerRotation = l * (Math.PI / petals);
    let colA, colB;
    if (_useRandom) {
      const _idxA = R.random_int(0, (palette.length) - 1);
      let _idxB = R.random_int(0, (palette.length - 1) - 1);
      if (_idxB >= _idxA) _idxB++;
      colA = palette[_idxA];
      colB = palette[_idxB];
    } else {
      colA = palette[l % palette.length];
      colB = palette[(l + 1) % palette.length];
    }
    const spinDir       = l % 2 === 0 ? 1 : -1;

    const petalGeo = buildPetalGeometry(petalWidth, petalLength, shape);
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

  const _centerRoll = R.random_dec();
  const centerMode  = isMonochrome ? 'none' : paletteName === 'pearl' ? (_centerRoll < 0.5 ? 'normal' : 'small') : (_centerRoll < 0.2 ? 'none' : _centerRoll < 0.6 ? 'normal' : 'small');
  const _baseSize   = R.random_num(0.04, 0.12) * 1000 * WORLD_SCALE;
  const centerSize  = centerMode === 'small' ? _baseSize * 0.3 : _baseSize;
  const _centerPalette = paletteName === 'hematite' ? [palette[2]] : [palette[0], palette[palette.length-1]];
  const centerHex   = R.random_choice(_centerPalette);
  const centerMat   = makeCenterMat(centerHex, 0.4);
  const centerGeo   = new THREE.IcosahedronBufferGeometry(centerSize / 2, 4);
  const centerMesh  = new THREE.Mesh(centerGeo, centerMat);
  const topZ        = (numLayers + 1) * LAYER_GAP;
  centerMesh.position.z = topZ;
  if (centerMode !== 'none') root.add(centerMesh);

  const showStamen = R.random_bool(0.8);
  if (showStamen) {
    const stamenZ = centerMode === 'none'
      ? (numLayers - 1.5) * LAYER_GAP
      : numLayers * LAYER_GAP;
    const numSticks  = R.random_int(8, 19);
    const slen       = centerSize * R.random_num(1.2, 2);
    const showPollen = R.random_bool(0.7);
    const _pyriteA = '#c8a840';
    const _pyriteB = '#b09030';
    const stamenColA = paletteName === 'lapis_lazuli' ? _pyriteA : palette[palette.length - 1];
    const stamenColB = paletteName === 'lapis_lazuli' ? _pyriteB : palette[palette.length - 2];
    const _sca = hexToRGB(stamenColA);
    const _scb = hexToRGB(stamenColB);
    const stemMatFinal   = new THREE.MeshStandardMaterial({ color: new THREE.Color(_scb[0],_scb[1],_scb[2]), metalness: 1.0, roughness: 0.12, envMapIntensity: 4.0 });
    const pollenMatFinal = new THREE.MeshStandardMaterial({ color: new THREE.Color(_sca[0],_sca[1],_sca[2]), metalness: 1.0, roughness: 0.12, envMapIntensity: 4.0 });
    const pollenR    = 0.05;

    const stemInner = centerMode === 'none' ? 0 : centerSize / 2;
    const polGeoShared = showPollen ? new THREE.IcosahedronBufferGeometry(pollenR, 2) : null;
    for (let i = 0; i < numSticks; i++) {
      const angle = (Math.PI * 2 / numSticks) * i;
      const x1 = Math.cos(angle) * stemInner;
      const y1 = Math.sin(angle) * stemInner;
      const x2 = Math.cos(angle) * slen;
      const y2 = Math.sin(angle) * slen;
      const dx = x2 - x1, dy = y2 - y1;
      const stemLen = Math.sqrt(dx*dx + dy*dy);

      const stemAngle = Math.atan2(dy, dx);
      const stemGeo   = new THREE.CylinderBufferGeometry(0.008, 0.008, stemLen, 6);
      const stemGroup = new THREE.Group();
      stemGroup.position.set((x1+x2)/2, (y1+y2)/2, stamenZ);
      stemGroup.rotation.z = stemAngle;
      const innerMesh = new THREE.Mesh(stemGeo, stemMatFinal);
      innerMesh.rotation.z = Math.PI / 2;
      stemGroup.add(innerMesh);
      root.add(stemGroup);

      if (showPollen) {
        const polMesh = new THREE.Mesh(polGeoShared, pollenMatFinal);
        polMesh.position.set(x2, y2, stamenZ + pollenR * 0.6);
        root.add(polMesh);
      }
    }
  }

  return { root, paletteName, numLayers, layerGroups, isMonochrome };
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);
const scene  = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();
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
const maxPetalRadius = 1000 * 0.45 * WORLD_SCALE;
const fovHalf = 20 * Math.PI / 180;

const _gridRoll = R.random_dec();
const GRID = _gridRoll < 0.03 ? 4 : _gridRoll < 0.05 ? 3 : _gridRoll < 0.10 ? 2 : 1;

const { root, numLayers, layerGroups, paletteName, isMonochrome } = generateFlower();

if (paletteName === 'hematite') {
  (function buildHematiteEnvMap() {
    const envScene = new THREE.Scene();
    const sGeo = new THREE.SphereBufferGeometry(50, 64, 32);
    const sColors = [];
    const sPos = sGeo.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      const y = sPos.getY(i);
      const norm = (y + 50) / 100;
      const r = 0.08 + norm * 0.22;
      const g = 0.08 + norm * 0.20;
      const b = 0.10 + norm * 0.24;
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
    scene.environment = pmrem.fromScene(envScene).texture;
  })();
  renderer.toneMappingExposure = 1.4;
  scene.traverse(obj => {
    if (obj.isMesh && obj.material) {
      obj.material.roughness = 0.02;
      obj.material.envMapIntensity = 6.0;
      obj.material.needsUpdate = true;
    }
  });
}

if (isMonochrome) {
  scene.environment = null;
  renderer.toneMappingExposure = 1.6;
  key.intensity = 1.4;
  const backLight = new THREE.DirectionalLight(0xffffff, 1.2);
  backLight.position.set(0, 0, -8);
  scene.add(backLight);
  const topLight = new THREE.DirectionalLight(0xffffff, 1.0);
  topLight.position.set(0, 8, 4);
  scene.add(topLight);
}

const _aspect      = window.innerWidth / window.innerHeight;
const _bgRoll      = R.random_dec();
const usePaletteBg = GRID === 1 && !isMonochrome && _bgRoll < 0.10;
if (usePaletteBg) {
  const _paletteBg    = COLOR_PALETTES[paletteName];
  const _bgHex        = paletteName === 'lapis_lazuli'
    ? _paletteBg[4]
    : _paletteBg[_paletteBg.length - 1];
  const [_br,_bg,_bb] = hexToRGB(_bgHex);
  const _planeSize    = Math.max(20, 20 * Math.max(_aspect, 1 / _aspect) * 1.5);
  const _bgPlaneGeo   = new THREE.PlaneBufferGeometry(_planeSize, _planeSize);
  const _bgPlaneMat   = new THREE.MeshStandardMaterial({
    color:           new THREE.Color(_br, _bg, _bb),
    metalness:       1.0,
    roughness:       0.08,
    envMapIntensity: 4.0,
  });
  const _bgPlane      = new THREE.Mesh(_bgPlaneGeo, _bgPlaneMat);
  _bgPlane.position.z = -((numLayers + 1) * LAYER_GAP) / 2 - 3;
  scene.add(_bgPlane);
}
scene.background = new THREE.Color(0, 0, 0);

const FILTER_NORMAL = 'contrast(1.45)';
const FILTER_MONO   = 'contrast(1.4) saturate(0)';
const activeFilter  = isMonochrome ? FILTER_MONO : FILTER_NORMAL;
renderer.domElement.style.filter = activeFilter;

scene.add(root);

const midZ = ((numLayers + 1) * LAYER_GAP) / 2;
root.position.z = -midZ;

const _fovAdj = _aspect < 1
  ? Math.atan(Math.tan(fovHalf) * _aspect)
  : fovHalf;
const camZ = (maxPetalRadius * 1.05) / Math.tan(_fovAdj);
camera.position.set(0, 0, camZ);
camera.lookAt(0, 0, 0);

const _speedRoll  = R.random_dec();
const _speedMode  = _speedRoll < 0.10 ? 'crawl' : _speedRoll < 0.20 ? 'run' : 'walk';
const BASE_SPEED  = _speedMode === 'crawl' ? 0.0005 : _speedMode === 'run' ? 0.007 : 0.0025;

(function buildPostNoise() {
  function gaussian() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const _nw = window.innerWidth;
  const _nh = window.innerHeight;
  const _nd = new Uint8Array(_nw * _nh * 4);
  for (let i = 0; i < _nd.length; i += 4) {
    const v = Math.max(0, Math.min(255, Math.round(128 + gaussian() * 10)));
    _nd[i] = _nd[i+1] = _nd[i+2] = v;
    _nd[i+3] = 255;
  }
  const noiseTex = new THREE.DataTexture(_nd, _nw, _nh, THREE.RGBAFormat);
  noiseTex.needsUpdate = true;

  const renderTarget = new THREE.WebGLMultisampleRenderTarget(_nw, _nh, { samples: 4 });

  const vShader = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }';
  const fShader = 'uniform sampler2D tDiffuse; uniform sampler2D tNoise; uniform float uStrength; varying vec2 vUv; void main() { vec4 color = texture2D(tDiffuse, vUv); vec3 noise = texture2D(tNoise, vUv).rgb; color.rgb = 1.0 - (1.0 - color.rgb) * (1.0 - noise * uStrength); gl_FragColor = color; }';

  const postScene  = new THREE.Scene();
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const postMat = new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse:  { value: renderTarget.texture },
      tNoise:    { value: noiseTex },
      uStrength: { value: 0.43 },
    },
    vertexShader:   vShader,
    fragmentShader: fShader,
    depthTest:  false,
    depthWrite: false,
  });
  postScene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), postMat));

  renderer._postScene    = postScene;
  renderer._postCamera   = postCamera;
  renderer._renderTarget = renderTarget;
})();

let tileCanvas = null, tileCtx = null;

if (GRID > 1) {
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.left = '-9999px';

  tileCanvas = document.createElement('canvas');
  tileCanvas.style.position = 'fixed';
  tileCanvas.style.top      = '0';
  tileCanvas.style.left     = '0';
  tileCanvas.style.width    = '100%';
  tileCanvas.style.height   = '100%';
  tileCanvas.style.display  = 'block';
  tileCanvas.style.filter   = activeFilter;
  tileCanvas.width  = window.innerWidth;
  tileCanvas.height = window.innerHeight;
  document.body.insertBefore(tileCanvas, document.body.firstChild);
  tileCtx = tileCanvas.getContext('2d');
}

(function animate() {
  requestAnimationFrame(animate);
  layerGroups.forEach((g, i) => {
    const speed = BASE_SPEED * (1 + i * 0.04);
    g.rotation.z += g.userData.spinDir * speed;
  });

  renderer.setRenderTarget(renderer._renderTarget);
  renderer.setClearColor(0x000000, 1);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(renderer._postScene, renderer._postCamera);

  if (GRID > 1 && tileCtx) {
    const tw = window.innerWidth  / GRID;
    const th = window.innerHeight / GRID;
    tileCtx.clearRect(0, 0, tileCanvas.width, tileCanvas.height);
    for (let row = 0; row < GRID; row++) {
      for (let col = 0; col < GRID; col++) {
        tileCtx.drawImage(renderer.domElement, col * tw, row * th, tw, th);
      }
    }
  }

})();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (renderer._renderTarget) { renderer._renderTarget.setSize(window.innerWidth, window.innerHeight); }
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  if (tileCanvas) {
    tileCanvas.width  = window.innerWidth;
    tileCanvas.height = window.innerHeight;
  }
});