// Run: npx ts-node remotion/render.ts
// Or: npx remotion render remotion/index.tsx UniHER-Presentation out/presentation.mp4
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';

async function main() {
  console.log('Bundling...');
  const bundled = await bundle({
    entryPoint: path.join(__dirname, 'index.tsx'),
  });

  const composition = await selectComposition({
    serveUrl: bundled,
    id: 'UniHER-Presentation',
  });

  console.log('Rendering video...');
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: path.join(__dirname, '..', 'out', 'presentation.mp4'),
  });

  console.log('Done! Output: out/presentation.mp4');
}

main().catch(console.error);
