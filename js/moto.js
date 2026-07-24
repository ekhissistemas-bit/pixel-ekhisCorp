// Paleta de colores
const PALETTE = {
  '.': 'transparent',

  // Casco
  'h': '#000000',
  'v': '#171616',

  // Piel
  's': '#f0b07d',

  // Ropa
  'j': '#f6e9e9',
  'p': '#454590',
  'g': '#eddcdc',
  'b': '#0b0b0c',

  // Moto
  'k': '#2e2e2e', // chasis/motor (gris más oscuro)
  'n': '#0d0d0d', // asiento (negro)
  'r': '#f5f5f5', // tanque (blanco)
  'e': '#9c9c9c', // escape

  // Nuevas piezas
  'f': '#f5f5f5', // guardabarros delantero (blanco)
  't': '#e8e8e8', // asiento/tanque (blanco)
  'a': '#040404', // suspensión
  'o': '#b38b3d', // barras suspensión

  // Ruedas
  'w': '#050505',
  'm': '#d2d2d2',
  'x': '#6a6a6a',
  'c': '#242424'
};

// Piloto + moto de motocross (fender delantero, tanque, escape), rojo/blanco/negro
// Solo el piloto (casco, visor, piel, jersey, guantes, pantalón, botas)
const RIDER_ROWS = [
"....hhhh......................",
"...hhhhhh.....................",
"...hvvvvh......................",
"...hssss.......................",
".....j.......................",
"....jjj.....................",
"....jjg.....................",
"....jjg...................",
"....jjg................",
"....j.ggggg.............",
"....j.....gg.............",
"....ppppp........................",
"....ppppp.........................",
".......pp...........................",
".......p...........................",
"......pp...........................",
"..... pp..........................",
"..... pp..........................",
"..... ppp.........................",
".......bb......................"
];

// Chasis extraído directamente de la imagen de referencia (análisis por pixel)
const BIKE_ROWS = [
"..................aa...........",
".................nna...........",
"...................ar..........",
"...rrrrrnn......rrrarr.........",
"....aarrrnnnnnnrrrrrarrrrr.....",
".....aarrrnnnnrrrrrrra...rr....",
".......rrrrnaarrrrrr.aa........",
"....kkkk.aaaaarrrrr...a........",
"...kkkkkk.aaaaaaaaa...akkkk...."
];

// Genera un guardabarros (arco) real, con la misma técnica de distancia al centro
function makeFenderRows(size) {
  const rows = [];
  const center = (size - 1) / 2;
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const enAnillo = dist <= r && dist >= r * 0.78;
      const enArcoSuperior = dy <= r * 0.15; // abierto por debajo (ahí va la llanta)
      row += (enAnillo && enArcoSuperior) ? 'r' : '.';
    }
    rows.push(row);
  }
  return rows;
}

const FENDER_ROWS = makeFenderRows(28);
// Genera una llanta REDONDA calculando distancia al centro (no a mano)
function makeWheelRows(size) {
  const rows = [];
  const center = (size - 1) / 2;
  const r = size / 2;
  const spokes = 10;
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r) {
        row += '.';                      // fuera del circulo
      } else if (dist > r * 0.80) {
        row += 'w';                      // llanta (goma)
      } else if (dist > r * 0.64) {
        row += 'm';                      // rin
      } else if (dist > r * 0.20) {
        const angle = Math.atan2(dy, dx);
        const a = ((angle + Math.PI) / (2 * Math.PI)) * spokes;
        const frac = a - Math.floor(a);
        row += (frac < 0.16 || frac > 0.84) ? 'x' : 'm'; // rayos sobre fondo relleno
      } else {
        row += 'c';                      // cubo central
      }
    }
    rows.push(row);
  }
  return rows;
}

const WHEEL_ROWS = makeWheelRows(16);

function renderGrid(el, rows, pixel) {
  const cols = Math.max(...rows.map(r => r.length));
  el.style.display = 'grid';
  el.style.gridTemplateColumns = `repeat(${cols}, ${pixel}px)`;
  el.style.gridAutoRows = `${pixel}px`;
  let html = '';
  for (const row of rows) {
    const padded = row.padEnd(cols, '.');
    for (const ch of padded) {
      const color = PALETTE[ch] || 'transparent';
      html += `<div style="width:${pixel}px;height:${pixel}px;background:${color};"></div>`;
    }
  }
  el.innerHTML = html;
}

// Dibuja el pixel-art en un <canvas> (una sola imagen, sin costuras entre celdas al rotar)
function renderCanvas(canvas, rows, pixel) {
  const cols = Math.max(...rows.map(r => r.length));
  canvas.width = cols * pixel;
  canvas.height = rows.length * pixel;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  rows.forEach((row, y) => {
    const padded = row.padEnd(cols, '.');
    for (let x = 0; x < cols; x++) {
      const ch = padded[x];
      const color = PALETTE[ch];
      if (!color || color === 'transparent') continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
    }
  });
}

// Dibuja una franja de "piso" con textura de ruido y un borde dentado irregular arriba (version original)
function drawGroundFillTile() {
  const tileW = 256, tileH = 442;
  const canvas = document.createElement('canvas');
  canvas.width = tileW;
  canvas.height = tileH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const baseColors = ['#150c30', '#1a0f38', '#120a2a'];
  const edgeColors = ['#8a6fd8', '#6a4fc0', '#7a5fd0', '#9a7fe8'];

  const blockSize = 4;
  const cols = Math.ceil(tileW / blockSize);

  // altura del borde variable por columna, generada como onda suave (sin saltos bruscos)
  // y forzada a que el inicio y el final coincidan, para que el tile no tenga costura vertical
  const edgeHeights = [];
  const waves = 3;
  for (let i = 0; i < cols; i++) {
    const t = (i / cols) * Math.PI * 2 * waves;
    const wave = Math.sin(t) * 1.2 + 2;
    edgeHeights.push(Math.max(1, Math.round(wave)));
  }

  for (let cx = 0; cx < cols; cx++) {
    const edgeBlocks = edgeHeights[cx];
    for (let cy = 0; cy < Math.ceil(tileH / blockSize); cy++) {
      const x = cx * blockSize;
      const y = cy * blockSize;
      let color;
      if (cy < edgeBlocks) {
        color = edgeColors[Math.floor(Math.random() * edgeColors.length)];
      } else {
        color = baseColors[Math.floor(Math.random() * baseColors.length)];
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, blockSize, blockSize);
    }
  }
  return canvas.toDataURL();
}

// Dibuja una hilera de edificios altos con ventanas encendidas, como una skyline nocturna
function drawSkylineTile() {
  const tileW = 240, tileH = 100;
  const canvas = document.createElement('canvas');
  canvas.width = tileW;
  canvas.height = tileH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const buildingColors = ['#1a0f38', '#241650', '#150c30', '#2a1a5c'];
  const windowColors = ['#ffd23f', '#ff9d4a', '#4ad8e8', '#ffffff'];

  let x = 0;
  while (x < tileW) {
    const bw = 16 + Math.floor(Math.random() * 12);           // más angostos
    const bh = 45 + Math.floor(Math.random() * (tileH - 45)); // más altos en general
    const by = tileH - bh;
    ctx.fillStyle = buildingColors[Math.floor(Math.random() * buildingColors.length)];
    ctx.fillRect(x, by, bw, bh);

    // antena en el techo, en algunos edificios
    if (Math.random() < 0.3) {
      ctx.fillRect(x + Math.floor(bw / 2), by - 8, 1, 8);
    }

    // ventanas chicas y densas en cuadrícula
    const winSize = 2, gap = 2;
    for (let wy = by + 4; wy < tileH - 4; wy += winSize + gap) {
      for (let wx = x + 3; wx < x + bw - 3; wx += winSize + gap) {
        if (Math.random() < 0.4) {
          ctx.fillStyle = windowColors[Math.floor(Math.random() * windowColors.length)];
          ctx.fillRect(wx, wy, winSize, winSize);
        }
      }
    }
    x += bw + 1;
  }
  return canvas.toDataURL();
}

const groundTileURL = drawGroundFillTile();
document.getElementById('fullGround').style.backgroundImage = `url(${groundTileURL})`;

const skylineTileURL = drawSkylineTile();
document.getElementById('fullSkyline').style.backgroundImage = `url(${skylineTileURL})`;

renderGrid(document.getElementById('bikeGrid'), BIKE_ROWS, 5);
renderGrid(document.getElementById('riderGrid'), RIDER_ROWS, 6);
renderCanvas(document.getElementById('rearSpin'), WHEEL_ROWS, 4);
renderCanvas(document.getElementById('frontSpin'), WHEEL_ROWS, 4);
// renderGrid(document.getElementById('rearFenderGrid'), FENDER_ROWS, 4);  // guardabarros oculto temporalmente
// renderGrid(document.getElementById('frontFenderGrid'), FENDER_ROWS, 4); // guardabarros oculto temporalmente


// Dibuja un globo pixel-art en el color pedido
function drawBalloonDataURL(color) {
  const rows = [
    "..cccc..",
    ".cccccc.",
    "csccccc.",
    "cccccccc",
    "cccccccc",
    "cccccccc",
    "cccccccc",
    ".cccccc.",
    "..cccc..",
    "...kk...",
    "...k....",
    "...k....",
    "..k.....",
    "...k...."
  ];
  const pixel = 4;
  const cols = 8;
  const canvas = document.createElement('canvas');
  canvas.width = cols * pixel;
  canvas.height = rows.length * pixel;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const localPalette = { '.': null, 'c': color, 's': '#ffffff88', 'k': '#4a3a2a' };
  rows.forEach((row, y) => {
    for (let x = 0; x < cols; x++) {
      const ch = row[x] || '.';
      const fill = localPalette[ch];
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
    }
  });
  return canvas.toDataURL();
}

document.querySelectorAll('.balloon').forEach(el => {
  const color = el.dataset.color || '#3fa9f5';
  el.style.backgroundImage = `url(${drawBalloonDataURL(color)})`;
});

// Fuente pixel-art 5x7 (estilo dot-matrix retro), solo las letras que usamos
const PIXEL_FONT = {
  'A': ["01110","10001","10001","11111","10001","10001","10001"],
  'C': ["01111","10000","10000","10000","10000","10000","01111"],
  'E': ["11111","10000","11110","10000","10000","10000","11111"],
  'F': ["11111","10000","11110","10000","10000","10000","10000"],
  'I': ["11111","00100","00100","00100","00100","00100","11111"],
  'L': ["10000","10000","10000","10000","10000","10000","11111"],
  'M': ["10001","11011","10101","10101","10001","10001","10001"],
  'N': ["10001","11001","10101","10011","10001","10001","10001"],
  'O': ["01110","10001","10001","10001","10001","10001","01110"],
  'P': ["11110","10001","10001","11110","10000","10000","10000"],
  'S': ["01111","10000","10000","01110","00001","00001","11110"],
  'U': ["10001","10001","10001","10001","10001","10001","01110"],
  'Z': ["11111","00001","00010","00100","01000","10000","11111"],
  'Ñ': ["01010","10001","11001","10101","10011","10001","10001"],
  '!': ["00100","00100","00100","00100","00100","00000","00100"],
  '¡': ["00100","00000","00100","00100","00100","00100","00100"],
  ' ': ["00000","00000","00000","00000","00000","00000","00000"],
  '0': ["01110","10001","10011","10101","11001","10001","01110"],
  '1': ["00100","01100","00100","00100","00100","00100","01110"],
  '2': ["01110","10001","00001","00010","00100","01000","11111"],
  '3': ["11110","00001","00001","01110","00001","00001","11110"],
  '4': ["10001","10001","10001","11111","00001","00001","00001"],
  '5': ["11111","10000","11110","00001","00001","10001","01110"],
  '6': ["01110","10000","11110","10001","10001","10001","01110"],
  '7': ["11111","00001","00010","00100","00100","00100","00100"],
  '8': ["01110","10001","10001","01110","10001","10001","01110"],
  '9': ["01110","10001","10001","01111","00001","10001","01110"],
  ':': ["00000","00100","00000","00000","00100","00000","00000"]
};

// Dibuja un texto completo en pixel-art dentro de un <canvas>, con sombra de contorno
function renderPixelText(canvas, text, pixel, mainColor, shadowColor) {
  const letters = text.split('').map(ch => PIXEL_FONT[ch] || PIXEL_FONT[' ']);
  const gap = 1;
  const totalCols = letters.reduce((sum, g) => sum + 5 + gap, 0) - gap;
  const shadowOffsetPx = 1; // corrimiento fijo en pixeles reales, pegado a la letra
  canvas.width = totalCols * pixel + shadowOffsetPx;
  canvas.height = 7 * pixel + shadowOffsetPx;
  canvas.style.width = canvas.width * 2.2 + 'px';
  canvas.style.height = canvas.height * 2.2 + 'px';
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function paint(offsetPxX, offsetPxY, color) {
    let cursorX = 0;
    letters.forEach(glyph => {
      glyph.forEach((row, y) => {
        for (let x = 0; x < 5; x++) {
          if (row[x] === '1') {
            ctx.fillStyle = color;
            ctx.fillRect((cursorX + x) * pixel + offsetPxX, y * pixel + offsetPxY, pixel, pixel);
          }
        }
      });
      cursorX += 5 + gap;
    });
  }

  paint(shadowOffsetPx, shadowOffsetPx, shadowColor); // sombra pegada a la letra
  paint(0, 0, mainColor);                              // texto principal
}

renderPixelText(document.getElementById('titleLine1'), '¡FELIZ', 2, '#ffffff', '#ff9d1f');
renderPixelText(document.getElementById('titleLine2'), 'CUMPLEAÑOS!', 2, '#ffd23f', '#c9781a');
renderPixelText(document.getElementById('introTitleCanvas'), '12:00', 2, '#ffd23f', '#c9781a');

// Textura de ruido sutil en tonos morado oscuro, para el fondo del boton PRESS START
function drawPressStartTexture() {
  const size = 24;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const baseColors = ['#1a1030', '#180e2c', '#1c1236', '#160c28'];
  const blockSize = 2;
  for (let y = 0; y < size; y += blockSize) {
    for (let x = 0; x < size; x += blockSize) {
      ctx.fillStyle = baseColors[Math.floor(Math.random() * baseColors.length)];
      ctx.fillRect(x, y, blockSize, blockSize);
    }
  }
  return canvas.toDataURL();
}

const pressStartTextureURL = drawPressStartTexture();
document.getElementById('introScreen').style.backgroundImage = `url(${pressStartTextureURL})`;
document.getElementById('introScreen').style.backgroundRepeat = 'repeat';

// Boton de abrir: efecto de estallido de particulas + destello, y luego muestra la animacion completa
document.getElementById('openButton').addEventListener('click', (e) => {
  const button = e.currentTarget;
  const introScreen = document.getElementById('introScreen');
  const burstCanvas = document.getElementById('openBurstCanvas');

  button.style.opacity = '0.7';
  button.disabled = true;

  // punto de origen del estallido: el centro del boton
  const rect = button.getBoundingClientRect();
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  burstCanvas.width = window.innerWidth;
  burstCanvas.height = window.innerHeight;
  const ctx = burstCanvas.getContext('2d');

  const colors = ['#ffd23f', '#ff5c7a', '#3fa9f5', '#4ade80', '#ffffff'];
  const particles = [];
  const count = 40;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    particles.push({
      x: originX, y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 3,
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }

  let flashAlpha = 0.9;

  function animateBurst() {
    ctx.clearRect(0, 0, burstCanvas.width, burstCanvas.height);

    // destello blanco que se desvanece rapido
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
      ctx.fillRect(0, 0, burstCanvas.width, burstCanvas.height);
      flashAlpha -= 0.08;
    }

    let alive = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravedad
      p.life -= 0.02;
      if (p.life > 0) {
        alive = true;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1;
      }
    });

    if (alive || flashAlpha > 0) {
      requestAnimationFrame(animateBurst);
    }
  }
  animateBurst();

  // tras un breve instante, se desvanece la pantalla de intro y aparece la animacion (pausada)
  setTimeout(() => {
    introScreen.classList.add('fading');
    setTimeout(() => {
      introScreen.style.display = 'none';
      const main = document.getElementById('mainContent');
      main.classList.add('visible');
      fitToScreen();

      // recien ahora #mainContent es visible, asi que recien ahora se puede medir su layout real
      if (window.alignBikeToGround) window.alignBikeToGround();

      // muestra el mensaje de "toca para iniciar" en vez de arrancar todo de una
      document.getElementById('tapToStart').classList.add('visible');
    }, 400);
  }, 200);
});

// Al tocar la pantalla, arranca todo el movimiento (ruedas, piso, fondo) y aparece el logro
document.getElementById('tapToStart').addEventListener('click', () => {
  document.getElementById('tapToStart').classList.remove('visible');
  document.getElementById('mainContent').classList.add('playing');
});

// Una vez arrancado, tocar la pantalla hace saltar la moto
const mainContentEl = document.getElementById('mainContent');
const bikeEl = document.getElementById('bike');
let jumpStartTime = 0;
const JUMP_DURATION_MS = 550; // debe coincidir con la duracion de la animacion bikeJump en el CSS

// pointerdown responde de inmediato (sin el retraso de ~300ms que 'click' puede tener en moviles)
mainContentEl.addEventListener('pointerdown', () => {
  if (!mainContentEl.classList.contains('playing')) return;
  if (bikeEl.classList.contains('jumping')) return; // evita re-disparar a mitad de salto
  bikeEl.classList.add('jumping');
  jumpStartTime = performance.now();
});

// Calcula que tan alto (en px) esta la moto en este instante, siguiendo la misma curva que la animacion CSS,
// sin necesidad de medir el DOM (barato de calcular, se puede llamar en cada frame sin costo)
function getCurrentJumpHeight() {
  if (!bikeEl.classList.contains('jumping')) return 0;
  const elapsed = performance.now() - jumpStartTime;
  const progress = Math.min(1, elapsed / JUMP_DURATION_MS);

  // puntos clave de la curva bikeJump (porcentaje de tiempo, altura en px), igual que el keyframe CSS
  const keyframes = [
    [0, 0], [0.08, 28], [0.16, 48], [0.24, 62], [0.32, 70],
    [0.40, 70], [0.50, 65], [0.62, 52], [0.74, 34], [0.86, 15], [1, 0]
  ];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const [t0, h0] = keyframes[i];
    const [t1, h1] = keyframes[i + 1];
    if (progress >= t0 && progress <= t1) {
      const localT = (progress - t0) / (t1 - t0 || 1);
      return h0 + (h1 - h0) * localT;
    }
  }
  return 0;
}
bikeEl.addEventListener('animationend', (e) => {
  if (e.animationName === 'bikeJump') {
    bikeEl.classList.remove('jumping');
  }
});

// --- Sistema de obstaculos (piedras) y monedas ---
(function () {
  const canvas = document.getElementById('obstacleCanvas');
  const ctx = canvas.getContext('2d');
  const toast = document.getElementById('gameToastCanvas');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // sprite de piedra: pixel-art simple, gris con sombra
  function drawRockSprite() {
    const c = document.createElement('canvas');
    const pixel = 3;
    const rows = [
      "..0110..",
      ".011111.",
      "01111112",
      "01111112",
      "22111122",
      ".222222."
    ];
    c.width = 8 * pixel;
    c.height = rows.length * pixel;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    const pal = { '0': '#8a8a9a', '1': '#6a6a78', '2': '#4a4a56' };
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (pal[row[x]]) {
          cx.fillStyle = pal[row[x]];
          cx.fillRect(x * pixel, y * pixel, pixel, pixel);
        }
      }
    });
    return c;
  }

  // sprite de bidon de gasolina rojo, pixel-art (tapa, cuerpo, franja de peligro)
  function drawFuelCanSprite() {
    const c = document.createElement('canvas');
    const pixel = 2;
    const rows = [
      "..000..",
      "..000..",
      "0000000",
      "0111110",
      "0122210",
      "0111110",
      "0000000"
    ];
    const cols = Math.max(...rows.map(r => r.length));
    c.width = cols * pixel;
    c.height = rows.length * pixel;
    const cx = c.getContext('2d');
    cx.imageSmoothingEnabled = false;
    const pal = { '0': '#5a0d0d', '1': '#c81e2a', '2': '#ffd23f' };
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (pal[row[x]]) {
          cx.fillStyle = pal[row[x]];
          cx.fillRect(x * pixel, y * pixel, pixel, pixel);
        }
      }
    });
    return c;
  }

  const rockSprite = drawRockSprite();
  const fuelCanSprite = drawFuelCanSprite();

  // muestra la piedra y el bidon como iconos de referencia en el panel de instrucciones
  const rulesRockCanvas = document.getElementById('rulesRockIcon');
  if (rulesRockCanvas) {
    rulesRockCanvas.width = 24;
    rulesRockCanvas.height = 24;
    const rulesRockCtx = rulesRockCanvas.getContext('2d');
    rulesRockCtx.imageSmoothingEnabled = false;
    rulesRockCtx.drawImage(rockSprite, 0, 4, 24, 18);
  }

  const rulesFuelCanCanvas = document.getElementById('rulesFuelCanIcon');
  if (rulesFuelCanCanvas) {
    rulesFuelCanCanvas.width = 24;
    rulesFuelCanCanvas.height = 24;
    const rulesFuelCanCtx = rulesFuelCanCanvas.getContext('2d');
    rulesFuelCanCtx.imageSmoothingEnabled = false;
    rulesFuelCanCtx.drawImage(fuelCanSprite, 1, 0, 22, 24);
  }

  let items = []; // { type: 'rock'|'fuelcan', x, y, w, h, resolved }
  let bikeX = null;
  let baselineY = null;
  let spawnTimer = null;
  let rafId = null;
  let gameOver = false;

  const TOTAL_JUMPS_TO_FILL = 18;
  let jumpsCompleted = 0;
  const levelFillEl = document.getElementById('levelFill');
  const levelPercentEl = document.getElementById('levelPercent');

  function updateLevelBar() {
    const pct = Math.min(100, Math.round((jumpsCompleted / TOTAL_JUMPS_TO_FILL) * 100));
    if (levelFillEl) levelFillEl.style.width = pct + '%';
    if (levelPercentEl) levelPercentEl.textContent = pct + '%';

    if (jumpsCompleted >= TOTAL_JUMPS_TO_FILL) {
      clearInterval(spawnTimer); // deja de aparecer obstaculos nuevos
      document.getElementById('mainContent').classList.add('completed');
      // espera a que termine la animacion de transicion del numero volador (950ms) antes de mostrar el 18 fijo
      setTimeout(() => {
        startFinalNumberFlicker();
        animateLevelNumberUp();
        if (window.triggerFireworksCelebration) window.triggerFireworksCelebration();
      }, 950);
    }
  }

  // Anima el numero de LEVEL cambiando de 17 a 18 (girando), y la barra reiniciandose a 1% en otro color
  function animateLevelNumberUp() {
    const levelNumberEl = document.getElementById('levelNumber');
    const levelFillEl2 = document.getElementById('levelFill');
    const levelPercentEl2 = document.getElementById('levelPercent');
    if (!levelNumberEl) return;

    levelNumberEl.classList.add('leveling-up');
    setTimeout(() => {
      levelNumberEl.textContent = '18';

      // justo cuando el numero cambia (a mitad del giro), la barra se resetea a 1% con color nuevo
      if (levelFillEl2) {
        levelFillEl2.classList.add('new-level');
        levelFillEl2.style.width = '1%';
      }
      if (levelPercentEl2) levelPercentEl2.textContent = '1%';
    }, 300); // cambia el numero justo a la mitad del giro, cuando esta de canto (invisible)
    setTimeout(() => {
      levelNumberEl.classList.remove('leveling-up');
    }, 600);
  }

  let finalFlickerTimer = null;

  // Dibuja el "17" final grande con llamitas, y las mantiene parpadeando en loop indefinido
  function startFinalNumberFlicker() {
    const jumpCountCanvas = document.getElementById('jumpCountCanvas');
    const finalNumberPixel = 6;
    let frame = 0;

    function drawFrame() {
      const tempCanvas = document.createElement('canvas');
      renderPixelText(tempCanvas, '18', finalNumberPixel, '#ffd23f', '#c9781a');
      const withFlames = drawCandleFlame(tempCanvas, frame, 2, finalNumberPixel);

      jumpCountCanvas.width = withFlames.width;
      jumpCountCanvas.height = withFlames.height;
      const finalCtx = jumpCountCanvas.getContext('2d');
      finalCtx.imageSmoothingEnabled = false;
      finalCtx.drawImage(withFlames, 0, 0);

      // renderPixelText/drawCandleFlame fijan su propio tamaño inline; lo forzamos de vuelta al tamaño visual deseado
      // (el contenedor .jump-count-wrap mantiene el espacio reservado fijo, asi que esto no mueve nada mas)
      jumpCountCanvas.style.width = '100px';
      jumpCountCanvas.style.height = '90px';
    }

    drawFrame();

    if (finalFlickerTimer) clearInterval(finalFlickerTimer);
    finalFlickerTimer = setInterval(() => {
      frame++;
      drawFrame();
    }, 120);
  }

  // Dibuja una llamita pixel-art individual, con silueta de llama real (punta, cintura, base ancha)
  // y 3 frames distintos para dar sensacion de parpadeo animado
  const FLAME_FRAMES = [
    [
      "...2...",
      "...2...",
      "..222..",
      "..222..",
      ".21112.",
      ".11111.",
      "..111..",
      "...1..."
    ],
    [
      "..2....",
      "..2....",
      ".222...",
      ".222...",
      "21112..",
      "11111..",
      ".111...",
      "..1...."
    ],
    [
      "....2..",
      "....2..",
      "...222.",
      "...222.",
      "..21112",
      "..11111",
      "...111.",
      "....1.."
    ]
  ];

  // Paleta con mas pasos intermedios, para un degradado mas suave (menos "bandas")
  const FLAME_GRADIENT = [
    '#ffffff', // 0: nucleo blanco puro
    '#fff2b0', // 1
    '#ffd23f', // 2: amarillo
    '#ffb020', // 3
    '#ff7a1f', // 4: naranja
    '#f2501f', // 5
    '#d92a1f', // 6
    '#a8121a'  // 7: rojo oscuro en la base
  ];

  function drawSingleFlame(frameIndex) {
    const flameCanvas = document.createElement('canvas');
    const pixel = 3;
    const shapeRows = FLAME_FRAMES[frameIndex % FLAME_FRAMES.length];
    const totalRows = shapeRows.length;

    // para cada fila, encuentra el rango real de columnas pintadas (para el sombreado lateral)
    const rowRanges = shapeRows.map(row => {
      let first = -1, last = -1;
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== '.') {
          if (first === -1) first = x;
          last = x;
        }
      }
      return { first, last };
    });

    const cols = Math.max(...shapeRows.map(r => r.length));
    flameCanvas.width = cols * pixel;
    flameCanvas.height = shapeRows.length * pixel;
    const fctx = flameCanvas.getContext('2d');
    fctx.imageSmoothingEnabled = false;

    shapeRows.forEach((row, y) => {
      const depth = y / (totalRows - 1); // 0 = punta, 1 = base
      const { first, last } = rowRanges[y];
      const width = Math.max(1, last - first);

      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.') continue;

        // que tan cerca del centro horizontal de la llama esta este pixel (0 = centro, 1 = borde)
        const centerX = (first + last) / 2;
        const distFromCenter = Math.abs(x - centerX) / (width / 2 || 1);

        // el indice de color combina profundidad vertical (mayor peso) y distancia al centro (sombreado lateral)
        const combined = depth * 0.75 + distFromCenter * 0.35;
        const idx = Math.min(FLAME_GRADIENT.length - 1, Math.round(combined * (FLAME_GRADIENT.length - 1)));

        fctx.fillStyle = FLAME_GRADIENT[idx];
        fctx.fillRect(x * pixel, y * pixel, pixel, pixel);
      }
    });
    return flameCanvas;
  }

  // Dibuja una velita pixel-art por CADA digito, alineada con el ancho real de cada caracter
  function drawCandleFlame(targetCanvas, frameIndex, digitCount, numberPixel) {
    const flame = drawSingleFlame(frameIndex);

    // mismo calculo de ancho por caracter que usa renderPixelText: 5 columnas + 1 de espacio, por el tamaño de pixel del numero
    const charWidth = (5 + 1) * numberPixel;

    const numW = targetCanvas.width;
    const numH = targetCanvas.height;
    const flameH = flame.height;
    const gapBetweenFlameAndNumber = 6;
    const combined = document.createElement('canvas');
    combined.width = numW;
    combined.height = numH + flameH + gapBetweenFlameAndNumber;
    const cctx = combined.getContext('2d');
    cctx.imageSmoothingEnabled = false;

    // una llama centrada sobre cada digito, con un espacio de separacion antes del numero
    for (let i = 0; i < digitCount; i++) {
      const digitCenterX = i * charWidth + charWidth / 2;
      cctx.drawImage(flame, digitCenterX - flame.width / 2, 0);
    }

    cctx.drawImage(targetCanvas, 0, flameH + gapBetweenFlameAndNumber);
    return combined;
  }

  let toastFlickerTimer = null;

  function drawToastFrame(text, color, numberPixel, frameIndex) {
    const tempCanvas = document.createElement('canvas');
    renderPixelText(tempCanvas, text, numberPixel, color, '#150c30');
    const withFlame = drawCandleFlame(tempCanvas, frameIndex, text.length, numberPixel);

    toast.width = withFlame.width;
    toast.height = withFlame.height;
    toast.style.width = (withFlame.width * 2.2) + 'px';
    toast.style.height = (withFlame.height * 2.2) + 'px';
    const tctx = toast.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    tctx.clearRect(0, 0, toast.width, toast.height);
    tctx.drawImage(withFlame, 0, 0);
  }

  function showToast(text, color) {
    const numberPixel = 4;
    let frame = 0;

    drawToastFrame(text, color, numberPixel, frame);

    toast.classList.remove('show');
    void toast.offsetWidth; // reinicia la animacion aunque se dispare seguido
    toast.classList.add('show');

    // redibuja la llama con un frame distinto cada poco tiempo, mientras el toast esta visible
    if (toastFlickerTimer) clearInterval(toastFlickerTimer);
    toastFlickerTimer = setInterval(() => {
      frame++;
      drawToastFrame(text, color, numberPixel, frame);
    }, 120);

    setTimeout(() => {
      clearInterval(toastFlickerTimer);
      toastFlickerTimer = null;
    }, 900); // coincide con la duracion de la animacion toastPop
  }

  // El ultimo numero (17) no se desvanece como los demas: se anima moviendose
  // y encogiendose hasta la posicion final donde queda fijo como el "17" grande
  function morphToastIntoFinalNumber() {
    drawToastFrame('18', '#ffd23f', 4, 0);
    toast.classList.remove('show');
    toast.style.opacity = '1';
    toast.style.transition = 'none';
    toast.style.transform = 'translate(-50%, -50%) scale(1)';

    // fuerza el reflow para que el navegador registre la posicion inicial antes de animar
    void toast.offsetWidth;

    // mide donde debe terminar (la posicion real del "17" final en el layout)
    const targetEl = document.getElementById('jumpCountCanvas');
    const targetRect = targetEl.getBoundingClientRect();
    const startRect = toast.getBoundingClientRect();

    const deltaX = (targetRect.left + targetRect.width / 2) - (startRect.left + startRect.width / 2);
    const deltaY = (targetRect.top + targetRect.height / 2) - (startRect.top + startRect.height / 2);
    const scale = targetRect.width / startRect.width;

    requestAnimationFrame(() => {
      toast.style.transition = 'transform 0.9s cubic-bezier(0.2, 0.8, 0.3, 1)';
      toast.style.transform = `translate(-50%, -50%) translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%, -50%) scale(1)';
      toast.style.transition = 'none';
    }, 950);
  }

  function measureBikeReference() {
    const wheelRect = document.getElementById('rearWheelPos').getBoundingClientRect();
    bikeX = wheelRect.left + wheelRect.width / 2;

    const groundRect = document.getElementById('fullGround').getBoundingClientRect();
    baselineY = groundRect.top; // borde superior real del piso
  }

  function spawnItem() {
    const isFuelCan = Math.random() < 0.35;
    const w = isFuelCan ? 26 : 24;
    const h = isFuelCan ? 30 : 18;
    // ambos se apoyan en el piso; el bidon es mas alto (equivale a dos piedras de altura)
    const y = baselineY - h;
    items.push({
      type: isFuelCan ? 'fuelcan' : 'rock',
      x: window.innerWidth + 20,
      y,
      w, h,
      resolved: false
    });
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const speed = 4.5;

    items = items.filter(item => {
      item.x -= speed;
      if (item.x < -40) return false;

      const sprite = item.type === 'fuelcan' ? fuelCanSprite : rockSprite;
      ctx.drawImage(sprite, item.x, item.y, item.w, item.h);

      // zona de colision: mientras el item se solapa horizontalmente con la moto, se revisa CADA frame
      const overlapX = item.x < bikeX + 20 && item.x + item.w > bikeX - 20;
      if (overlapX && !item.resolved) {
        const currentJumpHeight = getCurrentJumpHeight();
        const requiredHeight = item.type === 'fuelcan' ? 26 : 14; // el bidon, al ser mas alto, exige mas altura de salto

        if (currentJumpHeight < requiredHeight) {
          // en cualquier frame donde la moto no este lo bastante alta mientras se solapa, es choque inmediato
          item.resolved = true;
          triggerGameOver();
        }
      } else if (!overlapX && item.x + item.w < bikeX - 20 && !item.resolved) {
        // el item ya paso completamente de largo sin chocar en ningun frame: se cuenta como salto exitoso
        item.resolved = true;
        jumpsCompleted++;
        if (jumpsCompleted === TOTAL_JUMPS_TO_FILL) {
          morphToastIntoFinalNumber();
        } else {
          showToast(String(jumpsCompleted), '#4ade80');
        }
        updateLevelBar();
      }
      return true;
    });

    if (!gameOver) {
      rafId = requestAnimationFrame(loop);
    }
  }

  function triggerGameOver() {
    gameOver = true;
    clearInterval(spawnTimer);
    cancelAnimationFrame(rafId);
    document.getElementById('mainContent').classList.remove('playing');
    document.getElementById('gameOverScreen').classList.add('visible');
  }

  function resetGame() {
    items = [];
    gameOver = false;
    jumpsCompleted = 0;
    if (finalFlickerTimer) {
      clearInterval(finalFlickerTimer);
      finalFlickerTimer = null;
    }
    const levelNumberEl = document.getElementById('levelNumber');
    if (levelNumberEl) levelNumberEl.textContent = '17';
    document.getElementById('mainContent').classList.remove('completed');
    document.getElementById('levelFill').style.width = '0%';
    document.getElementById('levelPercent').textContent = '0%';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('gameOverScreen').classList.remove('visible');
    document.getElementById('mainContent').classList.add('playing');
    spawnTimer = setInterval(spawnItem, 1600); // al reintentar no repetimos el mensaje, arranca directo
    loop();
  }

  document.getElementById('retryButton').addEventListener('click', resetGame);

  let obstaclesStarted = false;

  // al tocar "iniciar", arranca el loop visual y muestra "TOCA PARA SALTAR",
  // pero los obstaculos NO empiezan a aparecer hasta el primer toque real del jugador
  document.getElementById('tapToStart').addEventListener('click', () => {
    measureBikeReference();
    loop();
    document.getElementById('tapToJump').classList.add('visible');
  });

  // el primer toque sobre mainContent (que ya hace saltar la moto) es el que arranca los obstaculos
  mainContentEl.addEventListener('pointerdown', () => {
    if (!mainContentEl.classList.contains('playing')) return;
    if (obstaclesStarted) return;
    obstaclesStarted = true;
    document.getElementById('tapToJump').classList.remove('visible');
    spawnTimer = setInterval(spawnItem, 1600);
  });
})();



// Franja de estrellas tipo "tile" que se repite y se desliza sin cortes (igual técnica que el piso)
function drawStarfieldTile() {
  const tileW = 200, tileH = 260;
  const canvas = document.createElement('canvas');
  canvas.width = tileW;
  canvas.height = tileH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const starColors = ['#ffffff', '#e8e0ff', '#8fd8ff'];
  const starCount = 45;
  for (let i = 0; i < starCount; i++) {
    const x = Math.floor(Math.random() * tileW);
    const y = Math.floor(Math.random() * tileH);
    const size = Math.random() < 0.8 ? 1 : 2;
    ctx.fillStyle = starColors[Math.floor(Math.random() * starColors.length)];
    ctx.globalAlpha = 0.4 + Math.random() * 0.6;
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
  return canvas.toDataURL();
}

const starfieldTileURL = drawStarfieldTile();
document.getElementById('starfield').style.backgroundImage = `url(${starfieldTileURL})`;



// Alinea la llanta trasera de la moto con la linea real del piso, midiendo posiciones reales en pantalla
function alignBikeToGround() {
  const wheelEl = document.getElementById('rearWheelPos');
  const groundEl = document.getElementById('fullGround');
  const sceneEl = document.getElementById('scene');
  if (!wheelEl || !groundEl || !sceneEl) return;

  // reseteo temporal para medir la posicion "natural" sin ajuste previo
  sceneEl.style.transform = 'none';

  const wheelRect = wheelEl.getBoundingClientRect();
  const groundRect = groundEl.getBoundingClientRect();

  // contacto real de la llanta (un poco arriba de su base, para que se vea apoyada, no enterrada)
  const wheelContactY = wheelRect.bottom - 12;
  const diff = groundRect.top - wheelContactY;

  sceneEl.style.transform = `translateY(${diff}px)`;
}

// Escala todo el diseño de forma uniforme (sin deformar) para que quepa completo en pantalla
function fitToScreen() {
  const wrap = document.querySelector('.wrap');
  if (window.innerWidth > 700) {
    wrap.style.transform = 'none'; // en desktop se ve a tamaño normal
    return;
  }
  wrap.style.transform = 'none'; // reseteo para medir el tamaño real
  const rect = wrap.getBoundingClientRect();
  const scale = Math.min(window.innerWidth / rect.width, window.innerHeight / rect.height);
  wrap.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', fitToScreen);
window.addEventListener('load', fitToScreen);
fitToScreen();

window.alignBikeToGround = alignBikeToGround; // expuesta para llamarla justo cuando mainContent se hace visible
window.addEventListener('resize', alignBikeToGround);



// Chispas en abanico horizontal detrás de la llanta trasera (como estela de polvo)
const dustHolder = document.getElementById('dust');
const dustCount = 10;
for (let i = 0; i < dustCount; i++) {
  const p = document.createElement('div');
  p.className = 'dust-particle';
  const angle = -45 + Math.random() * 60; // abanico ancho de verdad: de -45° a +15°
  const distance = 25 + Math.random() * 45;
  const dx = (-distance * Math.cos(angle * Math.PI / 180)).toFixed(1) + 'px';
  const dy = (-distance * Math.sin(angle * Math.PI / 180)).toFixed(1) + 'px';
  p.style.setProperty('--dx', dx);
  p.style.setProperty('--dy', dy);
  p.style.animationDelay = '-' + (Math.random() * 0.9).toFixed(2) + 's';
  p.style.animationDuration = (0.7 + Math.random() * 0.5).toFixed(2) + 's';
  dustHolder.appendChild(p);
}

// Trofeo pixel-art dorado, extraído directamente de la imagen de referencia (análisis por pixel)
function drawTrophy() {
  const rows = [
    "........................................",
    "........................................",
    ".........dyyyyyyyyyyyyyyyyyyyyyd........",
    ".........dyyyyyyyyyyyyyyyyyyyyyd........",
    ".........dyyyyyyyyyyyyyyyyyyyydd........",
    "..dyyyyyddyyyyyyyyyyyyyyyyyddddddyyyyyy.",
    "..yyyyydddyyyyyyyyyyyyyyyyyddddddyyyyyy.",
    "..yyddddddyyyyyyyyyyyyyyyyyydddd.ddddyy.",
    "..yyd....dyyyyyyyyyyyyyyyyyydddd....dyy.",
    "..yyd....dyyyyyyyyyyyyyyyyyydddd....dyy.",
    "..yyd....dyyyyyyyyyyyyyyyyyydddd....dyy.",
    "..yyd....dyyyyyyyyyyyyyyyyyydddd....dyy.",
    "..yyd....dyyyyyyyyyyyyyyyyyydddd....dyy.",
    "..ddddd...dyyyyyyyyyyyyyyyydddd...ddddd.",
    "....dyy...dyyyyyyyyyyyyyyyydddd...yyd...",
    "....dyy....dyyyyyyyyyyyyyyyddd....yyd...",
    ".......yyd.dyyyyyyyyyyyyyyyddd.dyyd.....",
    ".......yyd.dyyyyyyyyyyyyyyyddd.dyy......",
    ".......dydddyyyyyyyyyyyyyyydddddyd......",
    ".............dyyyyyyyyyyyddd............",
    ".............dyyyyyyyyyyyddd............",
    ".............dddyyyyyyyydddd............",
    "................yyyddyddd...............",
    "................yyddddddd...............",
    ".........d.......dddddddd.......d.......",
    ".......dd.........dddddd........dd......",
    ".......dd.........yyyddd........dd......",
    ".....d............yyyydd...........d.....",
    ".....d............yyyyyd............d....",
    ".................dyyyyyd................",
    "..............dyyyyyyyyyydd.............",
    "..............dyyyyyyyyyyyd.............",
    "............dddyyyyyyyyyyyddd...........",
    "............yyyyyyyyyyyyyyyddd..........",
    "............yyyyyyyyyyyyyyyddd..........",
    "............ddddddddddddddddd..........."
  ];
  const localPalette = { '.': null, 'd': '#8a5a12', 'y': '#f5b52a' };
  const pixel = 2;
  const cols = 40;
  const canvas = document.getElementById('trophyCanvas');
  if (!canvas) return;
  canvas.width = cols * pixel;
  canvas.height = rows.length * pixel;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  rows.forEach((row, y) => {
    for (let x = 0; x < cols; x++) {
      const fill = localPalette[row[x]];
      if (!fill) continue;
      ctx.fillStyle = fill;
      ctx.fillRect(x * pixel, y * pixel, pixel, pixel);
    }
  });
}
drawTrophy();

// Fuegos artificiales que suben desde los edificios y estallan en abanico radial
(function () {
  const canvas = document.getElementById('fireworksCanvas');
  const ctx = canvas.getContext('2d');
  let rockets = [];
  let particles = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  const colors = ['#ff5c7a', '#3fa9f5', '#ffd23f', '#4ade80', '#ff9d1f'];

  function launchRocket(forceHeart) {
    const x = 40 + Math.random() * (canvas.width - 80);
    const groundY = canvas.height * 1.1; // arranca bien abajo, oculto detrás del piso
    const targetY = canvas.height * (0.15 + Math.random() * 0.25);
    const isHeart = forceHeart || false;
    rockets.push({
      x, y: groundY, targetY,
      color: isHeart ? '#ff5c7a' : colors[Math.floor(Math.random() * colors.length)],
      isHeart
    });
  }

  function explode(x, y, color) {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 1.5;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color
      });
    }
  }

  // Explosion con forma de corazon: las particulas vuelan en direccion de corazon (igual que antes)
  // y ADEMAS se dibuja la silueta completa del corazon (contorno conectado) que se expande y se desvanece
  let heartBursts = []; // { x, y, age, maxAge, maxScale }

  function explodeHeart(x, y) {
    const count = 40;
    const heartColors = ['#ff5c7a', '#ff1f4d', '#ff8fa8', '#d81b52'];
    const speed = 1;
    for (let i = 0; i < count; i++) {
      const t = (i / count) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      const len = Math.sqrt(hx * hx + hy * hy) || 1;
      particles.push({
        x, y,
        vx: (hx / len) * speed,
        vy: (hy / len) * speed,
        life: 1.6,
        color: heartColors[Math.floor(Math.random() * heartColors.length)]
      });
    }

    // agrega el "flash" de silueta de corazon completo, en el punto de la explosion
    heartBursts.push({ x, y, age: 0, maxAge: 110, maxScale: 3.2 });
  }

  // Dibuja el contorno solido de un corazon (conectando la curva completa con lineas), creciendo y desvaneciendose
  function drawHeartBursts(ctx) {
    heartBursts = heartBursts.filter(h => {
      h.age++;
      if (h.age > h.maxAge) return false;

      const progress = h.age / h.maxAge; // 0 a 1

      // crece rapido al inicio (llega a tamaño completo en el primer 25% del tiempo)
      // y se mantiene visible el resto, desvaneciendose solo al final
      const growPortion = 0.25;
      const growProgress = Math.min(1, progress / growPortion);
      const scale = 0.4 + growProgress * (3.0 - 0.4);

      // opacidad: se mantiene solida la mayor parte del tiempo, se desvanece en el ultimo 30%
      const fadePortion = 0.7;
      const alpha = progress < fadePortion ? 1 : 1 - ((progress - fadePortion) / (1 - fadePortion));

      const points = 60;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const t = (i / points) * Math.PI * 2;
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        const px = h.x + hx * scale;
        const py = h.y + hy * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(255, 92, 122, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();

      return true;
    });
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawHeartBursts(ctx);

    // Cohetes subiendo
    rockets = rockets.filter(r => {
      r.y -= 5;
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x - 1, r.y, 2, 6);
      if (r.y <= r.targetY) {
        if (r.isHeart) {
          explodeHeart(r.x, r.y);
        } else {
          explode(r.x, r.y, r.color);
        }
        return false;
      }
      return true;
    });

    // Particulas del estallido
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02; // gravedad leve
      p.life -= 0.02;
      if (p.life <= 0) return false;

      ctx.globalAlpha = p.life;
      // linea desde el centro hasta la particula
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 3, p.y - p.vy * 3);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      // punto brillante en la punta
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      return true;
    });

    requestAnimationFrame(tick);
  }
  tick();

  // Lanza un cohete cada cierto tiempo, con algo de aleatoriedad
  let rocketTimer = setInterval(launchRocket, 1800);
  setTimeout(launchRocket, 400); // uno al inicio

  // Al completar los 17 saltos, lanza una lluvia intensa de cohetes por unos segundos,
  // mezclando corazones rojo/rosado con los cohetes normales
  window.triggerFireworksCelebration = function () {
    clearInterval(rocketTimer);
    const burstDuration = 3500;
    const burstInterval = setInterval(() => {
      launchRocket(Math.random() < 0.5); // ~50% de probabilidad de que sea corazon
    }, 180);
    // lanza varios de una vez para un efecto inmediato de "explosion de celebracion"
    for (let i = 0; i < 5; i++) {
      setTimeout(() => launchRocket(i % 2 === 0), i * 90);
    }
    setTimeout(() => {
      clearInterval(burstInterval);
      rocketTimer = setInterval(launchRocket, 1800); // vuelve al ritmo normal despues de la celebracion
    }, burstDuration);
  };
})();