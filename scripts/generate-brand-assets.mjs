import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const sourcePath = path.join(root, "public", "brand", "overmastery-dark.svg");
const publicIcons = path.join(root, "public", "icons");
const appDirectory = path.join(root, "src", "app");

await mkdir(publicIcons, { recursive: true });

const source = await readFile(sourcePath, "utf8");

function sourceAtSize(size) {
  return Buffer.from(
    source
      .replace('width="100%"', `width="${size}"`)
      .replace('height="100%"', `height="${size}"`),
  );
}

async function renderPng(size, destination) {
  const png = await sharp(sourceAtSize(size))
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  await writeFile(destination, png);
  return png;
}

await Promise.all([
  renderPng(192, path.join(publicIcons, "overmastery-192.png")),
  renderPng(512, path.join(publicIcons, "overmastery-512.png")),
  renderPng(512, path.join(publicIcons, "overmastery-maskable-512.png")),
  renderPng(180, path.join(appDirectory, "apple-icon.png")),
]);

const faviconSizes = [16, 32, 48];
const faviconPngs = await Promise.all(
  faviconSizes.map((size) =>
    sharp(sourceAtSize(size)).png({ compressionLevel: 9 }).toBuffer(),
  ),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(faviconPngs.length, 4);

const directory = Buffer.alloc(16 * faviconPngs.length);
let offset = header.length + directory.length;

faviconPngs.forEach((png, index) => {
  const entry = index * 16;
  const size = faviconSizes[index];
  directory.writeUInt8(size >= 256 ? 0 : size, entry);
  directory.writeUInt8(size >= 256 ? 0 : size, entry + 1);
  directory.writeUInt8(0, entry + 2);
  directory.writeUInt8(0, entry + 3);
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(png.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += png.length;
});

await writeFile(
  path.join(appDirectory, "favicon.ico"),
  Buffer.concat([header, directory, ...faviconPngs]),
);

console.log("Generated Overmastery PWA, Apple touch, and favicon assets.");
