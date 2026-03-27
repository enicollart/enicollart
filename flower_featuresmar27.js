function calculateFeatures(tokenData) {

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
    random_dec()        { this.useA = !this.useA; return this.useA ? this.prngA() : this.prngB(); }
    random_num(a, b)    { return a + (b - a) * this.random_dec(); }
    random_int(a, b)    { return Math.floor(this.random_num(a, b + 1)); }
    random_bool(p)      { return this.random_dec() < p; }
    random_choice(list) { return list[this.random_int(0, list.length - 1)]; }
  }

  const PALETTE_WEIGHTS = [
    ['pearl', 4.5],
    ['lapis lazuli', 8.5],
    ['garnet', 7.5],
    ['azurite', 10.0],
    ['fire opal', 9],
    ['chalcopyrite', 9.5],
    ['cobalt', 8.5],
    ['malachite', 9.0],
    ['citrine', 8.5],
    ['fluorite', 10.0],
    ['cinnabar', 9.0],
    ['hematite', 5.0],
    ['black and white', 1.0],
  ];

  const PALETTE_SIZES = {
    'pearl': 7, 'lapis lazuli': 6, 'garnet': 6, 'azurite': 6,
    'fire opal': 6, 'chalcopyrite': 5, 'cobalt': 5, 'malachite': 6,
    'hematite': 6, 'citrine': 5, 'fluorite': 7, 'cinnabar': 6,
  };

  const SHAPES = ['oval','pointy','spiky','exponential','looped','heart','trueHeart'];

  const R = new Random();

  // grid
  const _gridRoll = R.random_dec();
  const layout = _gridRoll < 0.03 ? '4x4' : _gridRoll < 0.05 ? '3x3' : _gridRoll < 0.10 ? '2x2' : 'single';

  // palette
  const _pw = R.random_dec() * 100;
  let palette = PALETTE_WEIGHTS[0][0];
  let _acc = 0;
  for (const [name, weight] of PALETTE_WEIGHTS) {
    _acc += weight;
    if (_pw < _acc) { palette = name; break; }
  }
  const isMonochrome = palette === 'black and white';
  const paletteSize  = PALETTE_SIZES[isMonochrome ? 'hematite' : palette];

  // parity (consume)
  R.random_choice(['even', 'odd']);

  // layers
  let layers;
  if (isMonochrome) {
    layers = R.random_int(8, 10);
  } else if (R.random_bool(0.2)) {
    layers = R.random_int(2, 3);
  } else {
    layers = R.random_int(4, 10);
  }

  // _useRandom (consume for azurite/citrine)
  let _useRandom = palette === 'lapis lazuli' || palette === 'garnet' || palette === 'malachite';
  if (palette === 'azurite') _useRandom = R.random_bool(0.4);
  else if (palette === 'citrine') _useRandom = R.random_bool(0.4);

  // layer loop (consume all per-layer RNG)
  for (let l = 0; l < layers; l++) {
    if (R.random_bool(0.15)) R.random_int(15, 19);
    else R.random_int(5, 14);
    R.random_num(40, 120);
    R.random_choice(SHAPES);
    if (_useRandom) {
      R.random_int(0, paletteSize - 1);
      R.random_int(0, paletteSize - 2);
    }
  }

  // center
  const _centerRoll = R.random_dec();
  const _centerMode = isMonochrome ? 'none' : palette === 'pearl' ? (_centerRoll < 0.5 ? 'normal' : 'small') : (_centerRoll < 0.2 ? 'none' : _centerRoll < 0.6 ? 'normal' : 'small');
  const center = _centerMode !== 'none';
  R.random_num(0.04, 0.12);
  const _cpSize = palette === 'hematite' ? 1 : 2;
  R.random_choice(new Array(_cpSize).fill(null));

  // stamen
  const stamen = R.random_bool(0.8);
  if (stamen) {
    R.random_int(8, 19);
    R.random_num(1.2, 2);
    R.random_bool(0.7);
  }

  // background
  const _bgRoll = R.random_dec();
  const background = layout === 'single' && !isMonochrome && _bgRoll < 0.10 ? 'palette' : 'black';

  // speed
  const _speedRoll = R.random_dec();
  const speed = _speedRoll < 0.10 ? '1' : _speedRoll < 0.20 ? '3' : '2';

  return {
    'Palette':    palette,
    'Layers':     layers.toString(),
    'Pistil':     center,
    'Stamen':     stamen,
    'Speed':      speed,
    'Layout':     layout,
    'Background': background,
  };
}