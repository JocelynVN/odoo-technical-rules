#!/usr/bin/env node
'use strict';

/*
 * Interactive installer for the plugins in this marketplace.
 *
 *   npx github:JocelynVN/odoo-technical-plugins
 *   npx github:JocelynVN/odoo-technical-plugins -- --agent cursor --dir .
 *
 * Zero runtime dependencies (Node built-ins only).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const MARKETPLACE = 'odoo-technical-plugins';

const C = {
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  b: (s) => `\x1b[34m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  d: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadPlugins() {
  const data = readJSON(path.join(ROOT, '.claude-plugin', 'marketplace.json'));
  return (data.plugins || []).map((p) => ({
    name: p.name,
    dir: path.resolve(ROOT, p.source),
    description: p.description || '',
  }));
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === 'install') continue;
    else if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--list') args.list = true;
    else if (a === '--yes' || a === '-y') args.yes = true;
    else if (a === '--global' || a === '-g') args.global = true;
    else if (a === '--agent') args.agent = argv[++i];
    else if (a === '--plugin') args.plugin = argv[++i];
    else if (a === '--dir') args.dir = argv[++i];
    else if (a.startsWith('--agent=')) args.agent = a.slice(8);
    else if (a.startsWith('--plugin=')) args.plugin = a.slice(9);
    else if (a.startsWith('--dir=')) args.dir = a.slice(6);
    else args._.push(a);
  }
  return args;
}

function help() {
  console.log(`
${C.bold('Odoo Technical Plugins — installer')}

${C.bold('Usage')}
  npx github:JocelynVN/odoo-technical-plugins            ${C.d('# interactive')}
  npx github:JocelynVN/odoo-technical-plugins -- [flags] ${C.d('# non-interactive')}

${C.bold('Flags')}
  --agent <claude|codex|cursor|all>   target agent(s)
  --plugin <name>                     plugin to install (default: all / the only one)
  --dir <path>                        project directory (default: current dir)
  --global                            install at user level instead of a project
  --list                              list available plugins
  -h, --help                          show this help

${C.bold('Examples')}
  npx github:JocelynVN/odoo-technical-plugins -- --agent cursor
  npx github:JocelynVN/odoo-technical-plugins -- --agent codex --global
`);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function findSkillDir(pluginDir) {
  const skillsRoot = path.join(pluginDir, 'skills');
  if (!fs.existsSync(skillsRoot)) return null;
  const dirs = fs.readdirSync(skillsRoot, { withFileTypes: true }).filter((e) => e.isDirectory());
  return dirs.length ? path.join(skillsRoot, dirs[0].name) : null;
}

function installClaude(plugin, target, isGlobal) {
  const skillDir = findSkillDir(plugin.dir);
  if (!skillDir) return console.log(C.y('  Claude Code: no skill found, skipped.'));
  const base = isGlobal
    ? path.join(os.homedir(), '.claude', 'skills')
    : path.join(target, '.claude', 'skills');
  const dest = path.join(base, path.basename(skillDir));
  copyDir(skillDir, dest);
  console.log(C.g(`  Claude Code: installed skill → ${dest}`));
  console.log(C.d(`    (marketplace alternative: /plugin install ${plugin.name}@${MARKETPLACE})`));
}

function installCodex(plugin, target, isGlobal) {
  const src = path.join(plugin.dir, 'dist', 'codex', 'AGENTS.md');
  if (!fs.existsSync(src)) return console.log(C.y('  Codex: no AGENTS.md, skipped.'));
  const content = fs.readFileSync(src, 'utf8');
  const marker = content.split('\n')[0];
  const dest = isGlobal
    ? path.join(os.homedir(), '.codex', 'AGENTS.md')
    : path.join(target, 'AGENTS.md');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) {
    if (fs.readFileSync(dest, 'utf8').includes(marker)) {
      return console.log(C.b(`  Codex: already present → ${dest}`));
    }
    fs.appendFileSync(dest, '\n\n' + content);
    return console.log(C.g(`  Codex: appended → ${dest}`));
  }
  fs.writeFileSync(dest, content);
  console.log(C.g(`  Codex: created → ${dest}`));
}

function installCursor(plugin, target, isGlobal) {
  const srcDir = path.join(plugin.dir, 'dist', 'cursor', '.cursor', 'rules');
  if (!fs.existsSync(srcDir)) return console.log(C.y('  Cursor: no rules, skipped.'));
  const destDir = isGlobal
    ? path.join(os.homedir(), '.cursor', 'rules')
    : path.join(target, '.cursor', 'rules');
  fs.mkdirSync(destDir, { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
    console.log(C.g(`  Cursor: installed → ${path.join(destDir, f)}`));
  }
}

const AGENTS = { claude: installClaude, codex: installCodex, cursor: installCursor };

function ask(rl, q) {
  return new Promise((res) => rl.question(q, (a) => res(a.trim())));
}

const KEY = { up: '\x1b[A', down: '\x1b[B', enter1: '\r', enter2: '\n', space: ' ', ctrlc: '\x03' };

function renderMenu(message, choices, idx, selected, multi) {
  const head =
    C.bold(message) +
    C.d(multi ? '   (↑/↓ move · space select · enter confirm)' : '   (↑/↓ move · enter select)');
  const body = choices.map((c, i) => {
    const cur = i === idx;
    const pointer = cur ? C.g('❯') : ' ';
    const box = multi ? (selected.has(i) ? C.g('◉') : '◯') + ' ' : '';
    const label = cur ? C.g(c.label) : c.label;
    const hint = c.hint ? '  ' + C.d(c.hint) : '';
    return `${pointer} ${box}${label}${hint}`;
  });
  return [head, ...body];
}

// Arrow-key menu. Single-select returns a value; multi-select returns an array.
function menu(message, choices, { multi = false } = {}) {
  return new Promise((resolve) => {
    const input = process.stdin;
    const out = process.stdout;
    let idx = 0;
    let prev = 0;
    const selected = new Set();

    const draw = () => {
      if (prev) out.write(`\x1b[${prev}A`);
      out.write('\x1b[J');
      const lines = renderMenu(message, choices, idx, selected, multi);
      out.write(lines.join('\n') + '\n');
      prev = lines.length;
    };

    const finish = (val) => {
      input.setRawMode(false);
      input.pause();
      input.removeListener('data', onData);
      out.write('\x1b[?25h');
      resolve(val);
    };

    const onData = (buf) => {
      const s = buf.toString();
      if (s === KEY.ctrlc) {
        finish();
        out.write('\n');
        process.exit(130);
      } else if (s === KEY.up || s === 'k') {
        idx = (idx - 1 + choices.length) % choices.length;
        draw();
      } else if (s === KEY.down || s === 'j') {
        idx = (idx + 1) % choices.length;
        draw();
      } else if (multi && s === KEY.space) {
        if (selected.has(idx)) selected.delete(idx);
        else selected.add(idx);
        draw();
      } else if (s === KEY.enter1 || s === KEY.enter2) {
        if (multi) {
          if (!selected.size) return; // require at least one
          finish([...selected].sort((a, b) => a - b).map((i) => choices[i].value));
        } else {
          finish(choices[idx].value);
        }
      }
    };

    out.write('\x1b[?25l');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
    draw();
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return help();

  const plugins = loadPlugins();
  if (args.list) {
    console.log(C.bold('Available plugins:'));
    plugins.forEach((p) => console.log(`  • ${p.name} ${C.d('— ' + p.description)}`));
    return;
  }

  let chosenPlugins;
  let agents;
  let isGlobal = !!args.global;
  let target = path.resolve(args.dir || '.');

  const canBeNonInteractive = args.agent && (args.plugin || plugins.length === 1);

  if (canBeNonInteractive) {
    chosenPlugins = args.plugin ? plugins.filter((p) => p.name === args.plugin) : plugins;
    if (!chosenPlugins.length) {
      console.error(C.y(`Unknown plugin: ${args.plugin}`));
      process.exit(1);
    }
    agents = args.agent === 'all' ? ['claude', 'codex', 'cursor'] : [args.agent];
  } else {
    if (!process.stdin.isTTY) {
      console.log(C.y('No interactive terminal. Pass flags, e.g. --agent all. Try --help.'));
      process.exit(1);
    }
    console.log(C.bold('\n📦 Odoo Technical Plugins installer'));

    let chosen;
    if (plugins.length === 1) {
      chosen = plugins[0];
      console.log(C.d(`\nPlugin: ${chosen.name} — ${chosen.description}`));
    } else {
      chosen = await menu(
        'Which plugin?',
        plugins.map((p) => ({ label: p.name, hint: p.description, value: p }))
      );
    }
    chosenPlugins = [chosen];

    agents = await menu(
      'Which AI agent(s)?',
      [
        { label: 'Claude Code', value: 'claude' },
        { label: 'Codex', value: 'codex' },
        { label: 'Cursor', value: 'cursor' },
      ],
      { multi: true }
    );

    isGlobal = await menu('Install scope?', [
      { label: 'This project', hint: process.cwd(), value: false },
      { label: 'Global (all projects)', value: true },
    ]);

    if (!isGlobal) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const d = await ask(rl, `Project directory ${C.d('[' + process.cwd() + ']')}: `);
      rl.close();
      target = path.resolve(d || '.');
    }
  }

  console.log('');
  for (const p of chosenPlugins) {
    console.log(C.bold(`Installing ${p.name}:`));
    for (const a of agents) (AGENTS[a] || (() => console.log(C.y(`  Unknown agent: ${a}`))))(p, target, isGlobal);
  }
  console.log('\n' + C.g('Done.') + ' ' + C.d('Reload your AI agent to pick up the rules.'));
}

main().catch((e) => {
  console.error(C.y('Error: ') + e.message);
  process.exit(1);
});
