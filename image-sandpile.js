let img;
let dsImg;
let outImg;
let deltaMask;
const DS_FACTOR = 10;
const BRIGHTEN_VALUE = 100;
let newWidth;
let newHeight;

function preload() {
  img = loadImage(
    "https://assets.codepen.io/4559259/87F20583-FB9D-4B50-A55F-09EAC710AECA_1_105_c.jpeg",
  );
}
function setup() {
  createCanvas(displayHeight, displayHeight);
  background(100);
  dsImg = downscale(img, DS_FACTOR);
}
function draw() {
  image(dsImg, 0, 0, displayHeight, displayHeight);
  noSmooth();
}

function mouseClicked() {
  let x = (mouseX / displayHeight) * dsImg.width;
  let y = (mouseY / displayHeight) * dsImg.height;
  console.log(`MouseX: ${mouseX}, MouseY: ${mouseY}`);
  console.log(Math.floor(x), Math.floor(y));
  brighten(x, y);
}

function brighten(x, y) {
  px = dsImg.get(x, y);
  // returns [R, G, B, A]

  for (let i = 0; i < 2; i++) {
    px[i] = (px[i] + BRIGHTEN_VALUE) % 255;
  }
  // px = [255, 255, 255, 255];

  dsImg.set(x, y, px);
  dsImg.updatePixels();
}

function getDeltaMask(img) {
  const rows = img.height;
  const cols = img.width;
  deltaMask = Array.from({ length: rows }, () => Array(cols).fill(0));
}

function brightenImage() {
  dsImg.loadPixels();
  outImg.loadPixels();

  for (let y = 0; y < dsImg.height; y++) {
    for (let x = 0; x < dsImg.width; x++) {
      let sourceIndex = x + y * dsImg.width * 4;

      outImg.pixels[sourceIndex + 0] =
        (dsImg.pixels[sourceIndex + 0] + BRIGHTEN_VALUE * deltaMask[y][x]) %
        255; // R
      outImg.pixels[sourceIndex + 1] =
        (dsImg.pixels[sourceIndex + 1] + BRIGHTEN_VALUE * deltaMask[y][x]) %
        255; // G
      outImg.pixels[sourceIndex + 2] =
        (dsImg.pixels[sourceIndex + 2] + BRIGHTEN_VALUE * deltaMask[y][x]) %
        255; // B
    }
    destImg.updatePixels();
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
