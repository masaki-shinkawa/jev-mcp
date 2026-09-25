import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

test('stdio server responds to initialize and tools/list', async () => {
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const builtServer = resolve(root, 'dist/server.js');
  const command = existsSync(builtServer) ? [builtServer] : ['--import', 'tsx', resolve(root, 'src/server.ts')];
  const child = spawn(process.execPath, command, { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  child.stdout.setEncoding('utf8').on('data', (chunk: string) => { stdout += chunk; });
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'test', version: '1' } } })}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })}\n`);

  const deadline = Date.now() + 5000;
  while (!stdout.includes('"id":2') && Date.now() < deadline) await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  child.kill();
  await once(child, 'exit');
  assert.match(stdout, /"name":"jev_decide"/);
  assert.match(stdout, /"id":2/);
});
