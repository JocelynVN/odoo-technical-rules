#!/usr/bin/env node
'use strict';

/*
 * Lifecycle manager for the plugins in this marketplace.
 *
 *   npx odoo-technical-plugins                 # interactive install
 *   npx odoo-technical-plugins install ...     # install (flags below)
 *   npx odoo-technical-plugins update          # refresh installed plugins
 *   npx odoo-technical-plugins uninstall       # remove installed plugins
 *   npx odoo-technical-plugins status          # what's installed where
 *   npx odoo-technical-plugins list            # available plugins
 *
 * Tracks installs in a manifest (.odoo-technical-plugins.json per project,
 * or ~/.odoo-technical-plugins.json for --global) so update/uninstall are
 * clean. Zero runtime dependencies (Node built-ins only).
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const MARKETPLACE = 'odoo-technical-plugins';
const MANIFEST_FILE = '.odoo-technical-plugins.json';
const VERSION = readJSON(path.join(ROOT, 'package.json')).version;

const C = {
  g: (s) => `\x1b[32m${s}\x1b[0m`,
  b: (s) => `\x1b[34m${s}\x1b[0m`,
  y: (s) => `\x1b[33m${s}\x1b[0m`,
  r: (s) => `\x1b[31m${s}\x1b[0m`,
  d: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadPlugins() {
  const data = readJSON(path.join(ROOT, 'plugins.json'));
  return (data.plugins || []).map((p) => ({
    name: p.name,
    dir: path.resolve(ROOT, p.source),
    description: p.description || '',
  }));
}

function findPlugin(name) {
  return loadPlugins().find((p) => p.name === name);
}

/* ----------------------------- arg parsing ------------------------------ */

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--yes' || a === '-y') args.yes = true;
    else if (a === '--global' || a === '-g') args.global = true;
    else if (a === '--list') args.list = true;
    else if (a === '--agent') args.agent = argv[++i];
    else if (a === '--plugin') args.plugin = argv[++i];
    else if (a === '--dir') args.dir = argv[++i];
    else if (a === '--test-cmd') args.testCmd = argv[++i];
    else if (a.startsWith('--agent=')) args.agent = a.slice(8);
    else if (a.startsWith('--plugin=')) args.plugin = a.slice(9);
    else if (a.startsWith('--dir=')) args.dir = a.slice(6);
    else if (a.startsWith('--test-cmd=')) args.testCmd = a.slice(11);
    else args._.push(a);
  }
  return args;
}

function help() {
  console.log(`
${C.bold('Odoo Technical Plugins')} ${C.d('v' + VERSION)}

${C.bold('Usage')}
  npx ${MARKETPLACE} [command] [flags]

${C.bold('Commands')}
  install        Install plugin(s) for an agent ${C.d('(default; interactive if no flags)')}
  update         Re-copy the latest files for everything already installed
  uninstall      Remove installed plugin(s) and clean the manifest
  status         Show what is installed (project + global)
  list           List available plugins
  help           Show this help

${C.bold('Flags')}
  --agent <claude|codex|cursor|all>   target agent(s)
  --plugin <name>                     plugin to act on (default: all)
  --dir <path>                        project directory (default: current dir)
  --test-cmd <cmd>                    odoo-bin test_lint command for odoo-test-lint
                                      ${C.d('(saved to .odoo-lint.json)')}
  --global                            act at user level instead of a project
  -y, --yes                           skip confirmation prompts
  -h, --help                          show this help

${C.bold('Examples')}
  npx ${MARKETPLACE}                              ${C.d('# interactive install')}
  npx ${MARKETPLACE} install --agent all
  npx ${MARKETPLACE} update --global
  npx ${MARKETPLACE} uninstall --agent cursor
  npx ${MARKETPLACE} status
`);
}

/* ------------------------------ fs helpers ------------------------------ */

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function findSkillDir(pluginDir) {
  const skillsRoot = path.join(pluginDir, 'skills');
  if (!fs.existsSync(skillsRoot)) return null;
  const dirs = fs.readdirSync(skillsRoot, { withFileTypes: true }).filter((e) => e.isDirectory());
  return dirs.length ? path.join(skillsRoot, dirs[0].name) : null;
}

function home(...parts) {
  return path.join(os.homedir(), ...parts);
}

/* ------------------------- odoo-test-lint config ------------------------ */
/* odoo-test-lint verifies code with Odoo's official `test_lint` run via
 * `odoo-bin`. That command is environment-specific (db, config, addons path,
 * docker wrapper...), so we record it in a project-root .odoo-lint.json and the
 * agent reuses it instead of asking every time. */

const ODOO_TEST_LINT = 'odoo-test-lint';

// Merge { test_lint_cmd } into <target>/.odoo-lint.json, preserving other keys.
function writeOdooLintConfig(target, cmd) {
  const file = path.join(target, '.odoo-lint.json');
  let cfg = {};
  if (fs.existsSync(file)) {
    try { cfg = readJSON(file); } catch { cfg = {}; }
  }
  cfg.test_lint_cmd = cmd;
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
  console.log(C.g(`  odoo-test-lint: test_lint command → ${file}`));
  console.log(C.d('  add .odoo-lint.json to .gitignore (the command is per-developer)'));
}

/* ----------------------- per-agent write / remove ----------------------- */
/* Rules must load at the START of every session, so we write them into each
 * agent's always-on project instructions file (a marker-wrapped block):
 *   Codex  → AGENTS.md            (global: ~/.codex/AGENTS.md)
 *   Cursor → AGENTS.md            (global: ~/.cursor/rules/<name>.mdc — no global AGENTS.md)
 *   Claude → CLAUDE.md            (global: ~/.claude/CLAUDE.md; Claude doesn't read AGENTS.md)
 * The block content is the plugin's SKILL.md body. Descriptor: { paths, blocks }. */

const AGENT_LABEL = { claude: 'Claude', codex: 'Codex', cursor: 'Cursor' };

// The rules text = the SKILL.md body (its YAML frontmatter stripped).
function skillBody(plugin) {
  const skillDir = findSkillDir(plugin.dir);
  if (!skillDir) return null;
  const txt = fs.readFileSync(path.join(skillDir, 'SKILL.md'), 'utf8');
  return txt.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

function stripBlock(text, marker) {
  const re = new RegExp(`\\n*<!-- BEGIN ${marker} -->[\\s\\S]*?<!-- END ${marker} -->\\n*`, 'g');
  return text.replace(re, '\n');
}

function fileHasBlock(file, marker) {
  return fs.existsSync(file) && fs.readFileSync(file, 'utf8').includes(`<!-- BEGIN ${marker} -->`);
}

// Write/replace a marker-wrapped block in an always-on file (AGENTS.md / CLAUDE.md),
// keeping the rest of the file intact.
function writeBlock(file, plugin, body, label) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const block = `<!-- BEGIN ${plugin.name} -->\n${body}\n<!-- END ${plugin.name} -->\n`;
  const existed = fs.existsSync(file);
  const had = existed && fileHasBlock(file, plugin.name);
  const stripped = existed ? stripBlock(fs.readFileSync(file, 'utf8'), plugin.name).trim() : '';
  fs.writeFileSync(file, stripped ? `${stripped}\n\n${block}` : block);
  console.log(C.g(`  ${label}: ${had ? 'updated' : existed ? 'appended' : 'created'} → ${file}`));
  return { paths: [], blocks: [{ file, marker: plugin.name }] };
}

// Cursor has no global AGENTS.md, so its global rule is an always-apply .mdc.
function writeCursorGlobalMdc(plugin, body) {
  const file = home('.cursor', 'rules', `${plugin.name}.mdc`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const desc = (plugin.description || plugin.name).replace(/\s+/g, ' ').trim();
  fs.writeFileSync(file, `---\ndescription: ${desc}\nalwaysApply: true\n---\n\n${body}\n`);
  console.log(C.g(`  Cursor: rule → ${file}`));
  return { paths: [file], blocks: [] };
}

function installAgent(plugin, agent, target, isGlobal) {
  const body = skillBody(plugin);
  if (!body) {
    console.log(C.y(`  ${AGENT_LABEL[agent]}: no SKILL.md, skipped.`));
    return null;
  }
  if (agent === 'claude') {
    return writeBlock(isGlobal ? home('.claude', 'CLAUDE.md') : path.join(target, 'CLAUDE.md'), plugin, body, 'Claude');
  }
  if (agent === 'codex') {
    return writeBlock(isGlobal ? home('.codex', 'AGENTS.md') : path.join(target, 'AGENTS.md'), plugin, body, 'Codex');
  }
  if (agent === 'cursor') {
    return isGlobal
      ? writeCursorGlobalMdc(plugin, body)
      : writeBlock(path.join(target, 'AGENTS.md'), plugin, body, 'Cursor');
  }
  return null;
}

const WRITERS = {
  claude: (p, t, g) => installAgent(p, 'claude', t, g),
  codex: (p, t, g) => installAgent(p, 'codex', t, g),
  cursor: (p, t, g) => installAgent(p, 'cursor', t, g),
};

// keepBlocks: file|marker keys still referenced by a remaining install (shared AGENTS.md).
function removeDescriptor(entry, keepBlocks = new Set()) {
  for (const p of entry.paths || []) {
    if (fs.existsSync(p)) {
      rmrf(p);
      console.log(C.g(`  removed → ${p}`));
    }
  }
  for (const blk of entry.blocks || []) {
    if (keepBlocks.has(`${blk.file}|${blk.marker}`)) continue;
    if (!fs.existsSync(blk.file)) continue;
    const stripped = stripBlock(fs.readFileSync(blk.file, 'utf8'), blk.marker).trim();
    if (stripped) {
      fs.writeFileSync(blk.file, stripped + '\n');
      console.log(C.g(`  removed block from → ${blk.file}`));
    } else {
      fs.unlinkSync(blk.file);
      console.log(C.g(`  removed → ${blk.file}`));
    }
  }
}

/* --------------------- on-disk discovery (manifest-less) ---------------- */
/* Detect what exists on disk for a plugin+agent so uninstall/status work even
 * without a manifest, and clean up older layouts (<=2.0 skill dirs). */

function discover(plugin, agent, target, isGlobal) {
  const base = isGlobal ? os.homedir() : target;
  const name = path.basename(findSkillDir(plugin.dir) || plugin.name);
  const paths = [];
  const blocks = [];

  // current: always-on block / global cursor mdc
  if (agent === 'claude') {
    const f = path.join(base, 'CLAUDE.md');
    if (fileHasBlock(f, plugin.name)) blocks.push({ file: f, marker: plugin.name });
  }
  if (agent === 'codex') {
    const f = path.join(base, 'AGENTS.md');
    if (fileHasBlock(f, plugin.name)) blocks.push({ file: f, marker: plugin.name });
  }
  if (agent === 'cursor') {
    if (isGlobal) {
      const mdc = path.join(base, '.cursor', 'rules', `${plugin.name}.mdc`);
      if (fs.existsSync(mdc)) paths.push(mdc);
    } else {
      const f = path.join(base, 'AGENTS.md');
      if (fileHasBlock(f, plugin.name)) blocks.push({ file: f, marker: plugin.name });
    }
  }

  // legacy (<=2.0): skill dir under .<agent>/skills/
  const skillDest = path.join(base, '.' + agent, 'skills', name);
  if (fs.existsSync(skillDest)) paths.push(skillDest);
  // legacy (<=1.4): Cursor project .cursor/rules/<name>.mdc
  if (agent === 'cursor' && !isGlobal) {
    const mdc = path.join(base, '.cursor', 'rules', `${plugin.name}.mdc`);
    if (fs.existsSync(mdc)) paths.push(mdc);
  }

  return paths.length || blocks.length ? { paths, blocks } : null;
}

// Union of manifest-tracked installs and on-disk discovery for a scope.
// For each plugin+agent we MERGE both sources (paths + blocks) so a leftover
// legacy artifact is cleaned even when the manifest only knows the new skill.
function collectInstalled(manifest, target, isGlobal, filterPlugin, filterAgent) {
  const byKey = new Map();
  const agentMatch = (a) => !filterAgent || filterAgent === 'all' || a === filterAgent;
  const merge = (plugin, agent, version, paths = [], blocks = []) => {
    const k = plugin + '|' + agent;
    const e = byKey.get(k) || { plugin, agent, version: 'untracked', paths: [], blocks: [] };
    for (const p of paths) if (!e.paths.includes(p)) e.paths.push(p);
    for (const b of blocks) if (!e.blocks.some((x) => x.file === b.file && x.marker === b.marker)) e.blocks.push(b);
    if (version && version !== 'untracked') e.version = version;
    byKey.set(k, e);
  };

  for (const e of manifest.installs || []) {
    if (filterPlugin && e.plugin !== filterPlugin) continue;
    if (!agentMatch(e.agent)) continue;
    merge(e.plugin, e.agent, e.version, e.paths, e.blocks);
  }
  for (const p of loadPlugins()) {
    if (filterPlugin && p.name !== filterPlugin) continue;
    for (const a of ['claude', 'codex', 'cursor']) {
      if (!agentMatch(a)) continue;
      const d = discover(p, a, target, isGlobal);
      if (d) merge(p.name, a, null, d.paths, d.blocks);
    }
  }
  return [...byKey.values()];
}

/* ------------------------------ manifest -------------------------------- */

function manifestPath(target, isGlobal) {
  return isGlobal ? home(MANIFEST_FILE) : path.join(target, MANIFEST_FILE);
}

function loadManifest(p) {
  return fs.existsSync(p) ? readJSON(p) : { name: MARKETPLACE, scope: null, installs: [] };
}

function saveManifest(p, m) {
  m.updatedAt = new Date().toISOString();
  if (!m.installs.length) {
    if (fs.existsSync(p)) fs.unlinkSync(p);
    return;
  }
  fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
}

function upsertInstall(m, entry) {
  m.installs = (m.installs || []).filter((e) => !(e.plugin === entry.plugin && e.agent === entry.agent));
  m.installs.push(entry);
}

/* ------------------------------ prompts --------------------------------- */

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
          if (!selected.size) return;
          finish([...selected].sort((a, b) => a - b).map((i) => choices[i].value));
        } else finish(choices[idx].value);
      }
    };

    out.write('\x1b[?25l');
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
    draw();
  });
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim()); }));
}

async function confirm(message, yes) {
  if (yes) return true;
  if (!process.stdin.isTTY) return false;
  const a = await ask(`${message} ${C.d('[y/N]')} `);
  return /^y(es)?$/i.test(a);
}

function resolveAgents(arg) {
  return arg === 'all' ? ['claude', 'codex', 'cursor'] : [arg];
}

/* ------------------------------ commands -------------------------------- */

function cmdList() {
  console.log(C.bold('Available plugins:'));
  loadPlugins().forEach((p) => console.log(`  • ${p.name} ${C.d('— ' + p.description)}`));
}

function cmdStatus() {
  let any = false;
  for (const isGlobal of [true, false]) {
    const target = isGlobal ? null : process.cwd();
    const items = collectInstalled(loadManifest(manifestPath(target, isGlobal)), target, isGlobal);
    if (!items.length) continue;
    any = true;
    console.log(C.bold(`\n${isGlobal ? 'Global' : 'Project (' + process.cwd() + ')'}`));
    for (const e of items) {
      const tag = e.version === 'untracked' ? C.d(' (untracked)') : C.d(' v' + (e.version || '?'));
      console.log(`  • ${e.plugin} ${C.d('→')} ${e.agent}${tag}`);
    }
  }
  if (!any) console.log(C.d('Nothing installed globally or in the current project.'));
}

async function cmdInstall(args) {
  const plugins = loadPlugins();
  let chosenPlugins;
  let agents;
  let isGlobal = !!args.global;
  let target = path.resolve(args.dir || '.');

  // Non-interactive as soon as --agent is given; --plugin is optional (defaults to all).
  const nonInteractive = !!args.agent;

  if (nonInteractive) {
    chosenPlugins = args.plugin ? plugins.filter((p) => p.name === args.plugin) : plugins;
    if (!chosenPlugins.length) {
      console.error(C.y(`Unknown plugin: ${args.plugin}`));
      process.exit(1);
    }
    agents = resolveAgents(args.agent);
  } else {
    if (!process.stdin.isTTY) {
      console.log(C.y('No interactive terminal. Pass flags, e.g. --agent all. Try --help.'));
      process.exit(1);
    }
    console.log(C.bold('\n📦 Odoo Technical Plugins installer'));
    if (plugins.length === 1) {
      chosenPlugins = plugins;
      console.log(C.d(`\nPlugin: ${plugins[0].name} — ${plugins[0].description}`));
    } else {
      chosenPlugins = await menu(
        'Which plugin(s)?',
        plugins.map((p) => ({ label: p.name, hint: p.description, value: p })),
        { multi: true }
      );
    }
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
      const d = await ask(`Project directory ${C.d('[' + process.cwd() + ']')}: `);
      target = path.resolve(d || '.');
    }
  }

  const mp = manifestPath(target, isGlobal);
  const manifest = loadManifest(mp);
  manifest.scope = isGlobal ? 'global' : 'project';

  console.log('');
  for (const p of chosenPlugins) {
    console.log(C.bold(`Installing ${p.name}:`));
    for (const a of agents) {
      const writer = WRITERS[a];
      if (!writer) {
        console.log(C.y(`  Unknown agent: ${a}`));
        continue;
      }
      const desc = writer(p, target, isGlobal);
      if (desc) upsertInstall(manifest, { plugin: p.name, agent: a, version: VERSION, ...desc });
    }
  }
  saveManifest(mp, manifest);

  // odoo-test-lint (project scope only): record the `odoo-bin ... -i test_lint`
  // command so the agent can run Odoo's official lint without asking later.
  const hasLint = chosenPlugins.some((p) => p.name === ODOO_TEST_LINT);
  if (hasLint && !isGlobal) {
    let cmd = args.testCmd;
    if (!cmd && !nonInteractive && process.stdin.isTTY) {
      console.log(
        C.d('\nodoo-test-lint runs Odoo\'s official test_lint via odoo-bin.') +
          C.d('\ne.g. odoo-bin -c odoo.conf -d <db> -u test_lint --test-enable --stop-after-init')
      );
      const ans = await ask('Command to run test_lint ' + C.d('(blank to set later)') + ': ');
      cmd = ans || null;
    }
    if (cmd) writeOdooLintConfig(target, cmd);
  }

  console.log('\n' + C.g('Done.') + ' ' + C.d(`Tracked in ${mp}. Reload your AI agent.`));
}

function cmdUpdate(args) {
  const isGlobal = !!args.global;
  const target = path.resolve(args.dir || '.');
  const mp = manifestPath(target, isGlobal);
  const manifest = loadManifest(mp);
  if (!manifest.installs.length) {
    console.log(C.y(`Nothing installed ${isGlobal ? 'globally' : 'in ' + target}. Run install first.`));
    return;
  }
  console.log(C.bold(`Updating ${manifest.installs.length} install(s) → v${VERSION}`));
  for (const e of [...manifest.installs]) {
    if (args.plugin && e.plugin !== args.plugin) continue;
    if (args.agent && args.agent !== 'all' && e.agent !== args.agent) continue;
    const plugin = findPlugin(e.plugin);
    if (!plugin) {
      console.log(C.y(`  ${e.plugin}: no longer in marketplace, skipped.`));
      continue;
    }
    const writer = WRITERS[e.agent];
    const desc = writer && writer(plugin, target, isGlobal);
    if (desc) upsertInstall(manifest, { plugin: e.plugin, agent: e.agent, version: VERSION, ...desc });
  }
  saveManifest(mp, manifest);
  console.log('\n' + C.g('Updated.'));
}

async function cmdUninstall(args) {
  const isGlobal = !!args.global;
  const target = path.resolve(args.dir || '.');
  const mp = manifestPath(target, isGlobal);
  const manifest = loadManifest(mp);
  const toRemove = collectInstalled(manifest, target, isGlobal, args.plugin, args.agent);
  if (!toRemove.length) {
    console.log(C.y(`Nothing installed ${isGlobal ? 'globally' : 'in ' + target}.`));
    const other = collectInstalled(loadManifest(manifestPath(target, !isGlobal)), target, !isGlobal);
    if (other.length) {
      console.log(
        C.d(
          `Tip: found install(s) ${isGlobal ? 'in this project' : 'globally'} — try ` +
            `${isGlobal ? 'without --global' : 'with --global'}.`
        )
      );
    }
    return;
  }
  console.log(C.bold('Will remove:'));
  toRemove.forEach((e) =>
    console.log(`  • ${e.plugin} → ${e.agent}${e.version === 'untracked' ? C.d(' (untracked)') : ''}`)
  );
  if (!(await confirm('Proceed?', args.yes))) {
    console.log(C.d('Cancelled.'));
    return;
  }
  console.log('');
  const removed = new Set(toRemove.map((e) => e.plugin + '|' + e.agent));
  // Which blocks are still owned by an install we're KEEPING (e.g. a shared
  // AGENTS.md used by both codex and cursor). Use the manifest — it records what
  // was actually installed; on-disk discovery can't tell who owns a shared file.
  const remaining = (manifest.installs || []).filter((e) => !removed.has(e.plugin + '|' + e.agent));
  const keepBlocks = new Set();
  for (const e of remaining) for (const b of e.blocks || []) keepBlocks.add(`${b.file}|${b.marker}`);
  for (const e of toRemove) removeDescriptor(e, keepBlocks);
  manifest.installs = (manifest.installs || []).filter((e) => !removed.has(e.plugin + '|' + e.agent));
  saveManifest(mp, manifest);
  console.log('\n' + C.g('Uninstalled.'));
}

/* -------------------------------- main ---------------------------------- */

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) return help();

  let cmd = (args._[0] || 'install').toLowerCase();
  if (cmd === 'upgrade') cmd = 'update';
  if (cmd === 'remove' || cmd === 'rm') cmd = 'uninstall';
  if (args.list) cmd = 'list';

  switch (cmd) {
    case 'list':
      return cmdList();
    case 'status':
      return cmdStatus();
    case 'update':
      return cmdUpdate(args);
    case 'uninstall':
      return cmdUninstall(args);
    case 'install':
      return cmdInstall(args);
    default:
      console.error(C.y(`Unknown command: ${cmd}`));
      help();
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(C.r('Error: ') + e.message);
  process.exit(1);
});
