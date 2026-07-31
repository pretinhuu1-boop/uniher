import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const deploymentFiles = [
  'deploy/vps/nginx-uniher.conf',
  'deploy/vps/nginx-uniher-https.conf',
  'deploy/vps/setup-https.sh',
];

describe('production proxy client IP boundary', () => {
  it.each(deploymentFiles)('%s overwrites forwarded client IP headers', (relativePath) => {
    const source = fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
    const normalized = source.replaceAll('\\$', '$');

    expect(normalized).toContain('proxy_set_header X-Real-IP $remote_addr;');
    expect(normalized).toContain('proxy_set_header X-Forwarded-For $remote_addr;');
    expect(normalized).not.toContain('$proxy_add_x_forwarded_for');
  });
});
