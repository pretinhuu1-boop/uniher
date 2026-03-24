/**
 * Test Runner Server — serves testes.html and executes Playwright via API
 * Run: node tests/server.js
 * Access: http://localhost:4444
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const PORT = 4444;
const TESTS_DIR = __dirname;
const ROOT_DIR = path.join(__dirname, '..');

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // API: Run tests
  if (url.pathname === '/api/run' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const { project } = JSON.parse(body || '{}');
        const configPath = path.join(TESTS_DIR, 'playwright.config.ts');
        let cmd = `npx playwright test --config="${configPath}"`;
        if (project && project !== 'all') cmd += ` --project=${project}`;

        console.log(`[RUN] ${cmd}`);
        const result = { success: false, output: '', stats: null };

        try {
          const output = execSync(cmd, { cwd: ROOT_DIR, encoding: 'utf-8', timeout: 120000, stdio: ['pipe', 'pipe', 'pipe'] });
          result.success = true;
          result.output = output;
        } catch (err) {
          result.output = (err.stdout || '') + '\n' + (err.stderr || '');
          // Playwright exits 1 on failures — parse results anyway
        }

        // Try to read JSON results — first from file, fallback to stdout
        const jsonPath = path.join(TESTS_DIR, 'results', 'results.json');
        try {
          let json = null;
          // Try results file first
          if (fs.existsSync(jsonPath)) {
            try { json = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
          }
          // Fallback: parse stdout (when --reporter=json sends to stdout)
          if (!json && result.output) {
            const jsonMatch = result.output.match(/\{[\s\S]*"suites"[\s\S]*\}/);
            if (jsonMatch) {
              try { json = JSON.parse(jsonMatch[0]); } catch {}
            }
          }
          if (json) {

            // Flatten all specs from nested suites
            function collectSpecs(suite) {
              const specs = [];
              for (const sp of (suite.specs || [])) {
                for (const t of (sp.tests || [])) {
                  const r = t.results?.[0];
                  specs.push({
                    title: sp.title,
                    group: suite.title,
                    ok: sp.ok,
                    status: r?.status || 'unknown',
                    duration: r?.duration || 0,
                    error: r?.error?.message?.replace(/\x1b\[[0-9;]*m/g, '') || null,
                    errorSnippet: r?.error?.snippet?.replace(/\x1b\[[0-9;]*m/g, '') || null,
                  });
                }
              }
              for (const sub of (suite.suites || [])) {
                specs.push(...collectSpecs(sub));
              }
              return specs;
            }

            const allSpecs = [];
            for (const suite of (json.suites || [])) {
              allSpecs.push(...collectSpecs(suite));
            }

            const passed = allSpecs.filter(s => s.status === 'passed').length;
            const failed = allSpecs.filter(s => s.status === 'failed').length;
            const skipped = allSpecs.filter(s => s.status === 'skipped').length;

            result.stats = {
              total: allSpecs.length,
              passed,
              failed,
              skipped,
              duration: json.stats?.duration || 0,
              tests: allSpecs,
            };
            result.success = (failed === 0);
          }
        } catch (e) { result.parseError = e.message; }
        // Don't send raw JSON as output when we have stats
        if (result.stats) result.output = '';

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, output: err.message }));
      }
    });
    return;
  }

  // API: Check status
  if (url.pathname === '/api/status') {
    let serverOk = false;
    try { execSync('curl -s http://localhost:3000/api/health', { timeout: 5000 }); serverOk = true; } catch {}
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ serverOk, port: PORT }));
    return;
  }

  // Serve static files
  let filePath = url.pathname === '/' ? '/testes.html' : url.pathname;
  filePath = path.join(TESTS_DIR, filePath);

  // Security: prevent path traversal
  if (!filePath.startsWith(TESTS_DIR)) { res.writeHead(403); res.end(); return; }

  try {
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n  UniHER Test Runner: http://localhost:${PORT}\n`);
});
