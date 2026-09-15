/**
 * Regenerate public/logo*.png from logo.jpg.
 *
 * The app only ever references /logo.png, so editing logo.jpg alone changes
 * nothing on screen — the PNGs are what ship. Run this after replacing the
 * source image:
 *
 *   npm run logo
 *
 * Uses PowerShell + System.Drawing so there is no image dependency to install.
 * Windows only; on another OS use any image tool to produce the same three
 * files (full size, 192x192 and 512x512, the square ones padded white).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(clientDir, 'logo.jpg');
const publicDir = join(clientDir, 'public');

if (!existsSync(source)) {
  console.error(`No source image at ${source}`);
  process.exit(1);
}

if (process.platform !== 'win32') {
  console.error('This script needs PowerShell. Generate the PNGs manually on this platform.');
  process.exit(1);
}

const script = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile("${source.replace(/\\/g, '\\\\')}")
$pub = "${publicDir.replace(/\\/g, '\\\\')}"
$src.Save("$pub\\logo.png", [System.Drawing.Imaging.ImageFormat]::Png)
foreach ($size in 192, 512) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'
  $g.Clear([System.Drawing.Color]::White)
  $scale = [Math]::Min($size / $src.Width, $size / $src.Height)
  $w = [int]($src.Width * $scale); $h = [int]($src.Height * $scale)
  $g.DrawImage($src, [int](($size - $w) / 2), [int](($size - $h) / 2), $w, $h)
  $g.Dispose()
  $bmp.Save("$pub\\logo-$size.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
Write-Output "$($src.Width)x$($src.Height)"
$src.Dispose()
`;

const size = execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script])
  .toString()
  .trim();

console.log(`Regenerated from logo.jpg (${size}):`);
for (const name of ['logo.png', 'logo-192.png', 'logo-512.png']) {
  const file = join(publicDir, name);
  console.log(`  public/${name}  ${(statSync(file).size / 1024).toFixed(1)} KB`);
}
console.log('\nHard-reload the browser (Ctrl+Shift+R) to clear the cached favicon.');
