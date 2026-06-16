let img;
let dsImg;
let outImg;
let deltaMask;
const DS_FACTOR = 4; // 10;
const BRIGHTEN_VALUE = 1024 * 1024; // 1024; // 512; // 256; // 128;
const MAX_GRAINS = 255;
let newWidth;
let newHeight;

function preload() {
  img = loadImage(
    "https://assets.codepen.io/4559259/87F20583-FB9D-4B50-A55F-09EAC710AECA_1_105_c.jpeg",
  );
}
function setup() {
  createCanvas(displayHeight, displayHeight);
  dsImg = downscale(img, DS_FACTOR);
  outImg = downscale(img, DS_FACTOR);
  makeDeltaMask(outImg);
  image(dsImg, 0, 0, displayHeight, displayHeight);
}

function draw() {
  noSmooth();

  if (mouseIsPressed) {
    let x = (mouseX / displayHeight) * dsImg.width;
    let y = (mouseY / displayHeight) * dsImg.height;
    increaseDeltaMask(Math.floor(x), Math.floor(y), BRIGHTEN_VALUE);
  }

  stepAbelianSandpile();
  brightenImage();
  image(outImg, 0, 0, displayHeight, displayHeight);
}

function getDeltaMask(x, y) {
  return deltaMask[y][x];
}

function setDeltaMask(x, y, amt) {
  deltaMask[y][x] = amt;
}

function increaseDeltaMask(x, y, amt) {
  deltaMask[y][x] += amt;
}

function makeDeltaMask(img) {
  const rows = img.height;
  const cols = img.width;
  deltaMask = Array.from({ length: rows }, () => Array(cols).fill(0));
}

function brightenImage() {
  dsImg.loadPixels();
  outImg.loadPixels();

  for (let y = 0; y < dsImg.height; y++) {
    for (let x = 0; x < dsImg.width; x++) {
      let sourceIndex = (x + y * dsImg.width) * 4;

      outImg.pixels[sourceIndex + 0] =
        (dsImg.pixels[sourceIndex + 0] + deltaMask[y][x]) % 256; // R
      outImg.pixels[sourceIndex + 1] =
        (dsImg.pixels[sourceIndex + 1] + deltaMask[y][x]) % 256; // G
      outImg.pixels[sourceIndex + 2] =
        (dsImg.pixels[sourceIndex + 2] + deltaMask[y][x]) % 256; // B
      // setting 50% opacity
      outImg.pixels[sourceIndex + 3] = 128;
    }
    outImg.updatePixels();
  }
}

function downscale(sourceImg, n) {
  // Define new w/h
  newWidth = Math.floor(sourceImg.width / n);
  newHeight = Math.floor(sourceImg.height / n);

  let destImg = createImage(newWidth, newHeight);

  sourceImg.loadPixels();
  destImg.loadPixels();

  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      let sourceX = x * n;
      let sourceY = y * n;

      let sourceIndex = (sourceX + sourceY * sourceImg.width) * 4;

      let destIndex = (x + y * destImg.width) * 4;

      destImg.pixels[destIndex + 0] = sourceImg.pixels[sourceIndex + 0]; // R
      destImg.pixels[destIndex + 1] = sourceImg.pixels[sourceIndex + 1]; // G
      destImg.pixels[destIndex + 2] = sourceImg.pixels[sourceIndex + 2]; // B
      destImg.pixels[destIndex + 3] = sourceImg.pixels[sourceIndex + 3]; // A
    }
  }
  destImg.updatePixels();
  return destImg;
}

function stepAbelianSandpile() {
  for (let y = 0; y < dsImg.height; y++) {
    for (let x = 0; x < dsImg.width; x++) {
      stepAbelianSandpileSlot(x, y);
    }
  }
}

function stepAbelianSandpileSlot(x, y) {
  let lastGrains = getDeltaMask(x, y);
  if (lastGrains < MAX_GRAINS) {
  } else {
    setDeltaMask(x, y, 0);
    var num_valid_directions = 0;
    num_valid_directions += 0 < x ? 1 : 0;
    num_valid_directions += x < dsImg.width - 1 ? 1 : 0;
    num_valid_directions += 0 < y ? 1 : 0;
    num_valid_directions += y < dsImg.height - 1 ? 1 : 0;
    let to_distribute = Math.floor(lastGrains / num_valid_directions);
    let leftover_grains = lastGrains % num_valid_directions;
    var north_grains = to_distribute;
    var south_grains = to_distribute;
    var east_grains = to_distribute;
    var west_grains = to_distribute;
    var hasDistributedLeftover = false;
    // north
    if (y < dsImg.height - 1) {
      if (hasDistributedLeftover) {
        increaseDeltaMask(x, y + 1, north_grains);
      } else {
        hasDistributedLeftover = true;
        increaseDeltaMask(x, y + 1, north_grains + leftover_grains);
      }
    }
    // south
    if (0 < y) {
      if (hasDistributedLeftover) {
        increaseDeltaMask(x, y - 1, south_grains);
      } else {
        hasDistributedLeftover = true;
        increaseDeltaMask(x, y - 1, south_grains + leftover_grains);
      }
    }
    // east
    if (x < dsImg.width - 1) {
      if (hasDistributedLeftover) {
        increaseDeltaMask(x + 1, y, east_grains);
      } else {
        hasDistributedLeftover = true;
        increaseDeltaMask(x + 1, y, east_grains + leftover_grains);
      }
    }
    // west
    if (0 < x) {
      if (hasDistributedLeftover) {
        increaseDeltaMask(x - 1, y, west_grains);
      } else {
        hasDistributedLeftover = true;
        increaseDeltaMask(x - 1, y, west_grains + leftover_grains);
      }
    }
  }
}
