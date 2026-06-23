// Image sandpile — drop "grains" of brightness on a downscaled image and let
// them topple across the grid like an Abelian sandpile, smearing color around.
let dsImg; // downscaled copy; the unchanging base we brighten from
let outImg; // per-frame render target (brightened version of dsImg)
let grains; // 2D array [row][col] of accumulated grains per cell
let gridWidth;
let gridHeight;

const DOWNSCALE = 10; // shrink the image this much before simulating
const GRAINS_PER_CLICK = 255 ** 2; // grains dropped on a cell while the mouse is held
const TOPPLE_THRESHOLD = 255; // a cell topples once it holds at least this many grains

async function setup() {
  const img = await loadImage("mona_lisa.jpg");

  dsImg = downscale(img, DOWNSCALE);
  gridWidth = dsImg.width;
  gridHeight = dsImg.height;
  outImg = createImage(gridWidth, gridHeight);
  grains = makeGrid(gridWidth, gridHeight);

  // Canvas matches the grid's aspect ratio so the image isn't stretched.
  createCanvas(displayHeight * (gridWidth / gridHeight), displayHeight);
  noSmooth();

  image(dsImg, 0, 0, width, height); // opaque first frame to blend onto
}

function draw() {
  // While held, pour grains onto the cell under the mouse.
  if (mouseIsPressed) {
    const col = Math.floor((mouseX / width) * gridWidth);
    const row = Math.floor((mouseY / height) * gridHeight);
    grains[row][col] += GRAINS_PER_CLICK;
  }

  topple();
  brightenImage();
  image(outImg, 0, 0, width, height); // drawn at 50% alpha, so frames blend/trail
}

// One sweep of the sandpile. Cells are updated in place, so grains can cascade
// to later cells within the same frame — this directional spread is intentional.
const topple = () => {
  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      toppleCell(col, row);
    }
  }
};

const toppleCell = (col, row) => {
  const amount = grains[row][col];
  if (amount < TOPPLE_THRESHOLD) return;

  grains[row][col] = 0;

  // In-bounds neighbors in a fixed order; the first one also absorbs the remainder.
  const neighbors = [];
  if (row < gridHeight - 1) neighbors.push([col, row + 1]);
  if (row > 0) neighbors.push([col, row - 1]);
  if (col < gridWidth - 1) neighbors.push([col + 1, row]);
  if (col > 0) neighbors.push([col - 1, row]);

  const share = Math.floor(amount / neighbors.length);
  const remainder = amount % neighbors.length;
  neighbors.forEach(([nCol, nRow], i) => {
    grains[nRow][nCol] += share + (i === 0 ? remainder : 0);
  });
};

// Write dsImg + accumulated grains into outImg (brightness wraps at 256 for the
// color-cycling look), at half opacity.
const brightenImage = () => {
  dsImg.loadPixels();
  outImg.loadPixels();

  for (let row = 0; row < gridHeight; row++) {
    for (let col = 0; col < gridWidth; col++) {
      const i = (col + row * gridWidth) * 4;
      const boost = grains[row][col];

      const rgbObject = {
        r: dsImg.pixels[i],
        g: dsImg.pixels[i + 1],
        b: dsImg.pixels[i + 2],
      };

      const labObject = rgbToOklab(rgbObject);

      labObject.L = (labObject.L + boost / 2560.0) % 1.0;
      const newRGB = oklabToSRGB(labObject);

      outImg.pixels[i] = newRGB.r; // R
      outImg.pixels[i + 1] = newRGB.g; // G
      outImg.pixels[i + 2] = newRGB.b; // B
      outImg.pixels[i + 3] = 255; // 100% opacity
    }
  }
  outImg.updatePixels();
};

// Nearest-neighbor downscale by an integer factor.
const downscale = (src, factor) => {
  const out = createImage(
    Math.floor(src.width / factor),
    Math.floor(src.height / factor),
  );

  src.loadPixels();
  out.loadPixels();
  for (let row = 0; row < out.height; row++) {
    for (let col = 0; col < out.width; col++) {
      out.set(col, row, src.get(col * factor, row * factor));
    }
  }
  out.updatePixels();
  return out;
};

const makeGrid = (cols, rows) => {
  return Array.from({ length: rows }, () => new Array(cols).fill(0));
};
// This gist contains JavaScript functions and tests for:
// - conversion from gamma-corrected (or gamma-compressed) sRGB to linear RGB, to Oklab
// - interpolation through Oklab
// - conversion back to linear RGB, then sRGB
// To use these tests, install nodejs, save this file locally, and run with:
//    node OklabExperiments.js
// No other dependencies are required to use this.
// Thanks to some helpful folks in the generative art community for helping me better understand what's happening with this.

// My toddler smacked the keyboard with a piece of cardboard and made me accidentally type:
// zaser~

// Some color / math code tweaked from functions found in this repo: https://github.com/mattdesl/tiny-artblocks

const clamp = (value, min, max) => {
  return Math.max(Math.min(value, max), min);
};

// correlary of first psuedocode block here (f_inv) : https://bottosson.github.io/posts/colorwrong/#what-can-we-do%3F ; "applying the inverse of the sRGB nonlinear transform function.." -- keeping the abbreviated syntax of arrow functions and ? : if/then, despite that they confuse and stretch my noob brain:
const gammaToLinear = (c) =>
  c >= 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92;
// correlary of the first " : "..then switching back" :
const linearToGamma = (c) =>
  c >= 0.0031308 ? 1.055 * Math.pow(c, 1 / 2.4) - 0.055 : 12.92 * c;

// Lab coordinates (parameters):
// L = Lightness (0 (black) to ?? (diffuse white)
// a = green (at negative -- is there a lower bound?) to red (positive)
// b = blue (at negative) to yellow (at positive).
// You can manually construct an object literal to pass to this function this way:
// labVals = {L: 0.75, a: 0.7, b: 0.2};
// sRGBresultObjectLiteral = oklabToSRGB(labVals);
// You can also construct that as just {0.75, 0.7, 0.2}, and still pass it and it will work, apparently
// "..Oklab is represented as an object {L, a, b} where L is between 0 and 1 for normal SRGB colors. a and b have a less clearly defined range, but will normally be between -0.5 and +0.5. Neutral gray colors will have a and b at zero (or very close)." re: https://www.npmjs.com/package/oklab
// numbers updated from C++ example at https://bottosson.github.io/posts/oklab/ as updated 2021-01-25
// helpful references:
// https://observablehq.com/@sebastien/srgb-rgb-gamma
// Other references: https://matt77hias.github.io/blog/2018/07/01/linear-gamma-and-sRGB-color-spaces.html
// Takeaway: before manipulating color for sRGB (gamma-corrected or gamma compressed), convert it to linear RGB or a linear color space. Then do the manipulation, then convert it back to sRGB.
const rgbToOklab = ({ r, g, b }) => {
  // This is my understanding: JavaScript canvas and many other virtual and literal devices use gamma-corrected (non-linear lightness) RGB, or sRGB. To convert sRGB values for manipulation in the Oklab color space, you must first convert them to linear RGB. Where Oklab interfaces with RGB it expects and returns linear RGB values. This next step converts (via a function) sRGB to linear RGB for Oklab to use:
  r = gammaToLinear(r / 255);
  g = gammaToLinear(g / 255);
  b = gammaToLinear(b / 255);
  // This is the Oklab math:
  var l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  var m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  var s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  // Math.crb (cube root) here is the equivalent of the C++ cbrtf function here: https://bottosson.github.io/posts/oklab/#converting-from-linear-srgb-to-oklab
  l = Math.cbrt(l);
  m = Math.cbrt(m);
  s = Math.cbrt(s);
  return {
    L: l * +0.2104542553 + m * +0.793617785 + s * -0.0040720468,
    a: l * +1.9779984951 + m * -2.428592205 + s * +0.4505937099,
    b: l * +0.0259040371 + m * +0.7827717662 + s * -0.808675766,
  };
};

const oklabToSRGB = ({ L, a, b }) => {
  var l = L + a * +0.3963377774 + b * +0.2158037573;
  var m = L + a * -0.1055613458 + b * -0.0638541728;
  var s = L + a * -0.0894841775 + b * -1.291485548;
  // The ** operator here cubes; same as l_*l_*l_ in the C++ example:
  l = l ** 3;
  m = m ** 3;
  s = s ** 3;
  var r = l * +4.0767416621 + m * -3.3077115913 + s * +0.2309699292;
  var g = l * -1.2684380046 + m * +2.6097574011 + s * -0.3413193965;
  var b = l * -0.0041960863 + m * -0.7034186147 + s * +1.707614701;
  // Convert linear RGB values returned from oklab math to sRGB for our use before returning them:
  r = 255 * linearToGamma(r);
  g = 255 * linearToGamma(g);
  b = 255 * linearToGamma(b);
  // OPTION: clamp r g and b values to the range 0-255; but if you use the values immediately to draw, JavaScript clamps them on use:
  r = clamp(r, 0, 255);
  g = clamp(g, 0, 255);
  b = clamp(b, 0, 255);
  // OPTION: round the values. May not be necessary if you use them immediately for rendering in JavaScript, as JavaScript (also) discards decimals on render:
  r = Math.round(r);
  g = Math.round(g);
  b = Math.round(b);
  return { r, g, b };
};
