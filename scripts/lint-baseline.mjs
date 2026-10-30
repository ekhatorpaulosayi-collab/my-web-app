import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const result = spawnSync('npx', ['eslint', '.', '-f', 'json'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});
if (!result.stdout) {
  process.stderr.write(result.stderr || 'eslint produced no report\n');
  process.exit(result.status || 1);
}

const report = JSON.parse(result.stdout);
const current = {};
for (const file of report) {
  const errors = file.messages.filter((message) => message.severity === 2);
  if (!errors.length) continue;
  const rel = file.filePath.replace(`${process.cwd()}/`, '');
  current[rel] = {};
  for (const message of errors) {
    const rule = message.ruleId || 'parse';
    current[rel][rule] = (current[rel][rule] || 0) + 1;
  }
}

const baseline = JSON.parse(readFileSync(new URL('../.eslint-baseline.json', import.meta.url), 'utf8'));
const over = [];
for (const [file, rules] of Object.entries(current)) {
  for (const [rule, count] of Object.entries(rules)) {
    const allowed = baseline[file]?.[rule] || 0;
    if (count > allowed) {
      over.push(`${file} ${rule}: ${count} (baseline ${allowed})`);
    }
  }
}

if (over.length) {
  process.stderr.write(`Lint is above the baseline:\n${over.join('\n')}\n`);
  process.exit(1);
}

const errorCount = Object.values(current).reduce(
  (sum, rules) => sum + Object.values(rules).reduce((inner, count) => inner + count, 0),
  0,
);
process.stdout.write(`lint within baseline (${errorCount} existing errors)\n`);
