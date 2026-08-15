'use strict';

const vscode = require('vscode');
const { execFile } = require('node:child_process');
const path = require('node:path');

const TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Which scripts to run, and how to tell a figure from a document. The defaults match
 * the layout this was written against; they are settings so the extension is not
 * silently shaped by one project's conventions.
 */
function config() {
  const c = vscode.workspace.getConfiguration('tikz');
  let figureFolders;
  try {
    figureFolders = new RegExp(`(?:^|/)(?:${c.get('figureFolders')})$`);
  } catch {
    vscode.window.showWarningMessage('TikZ: tikz.figureFolders is not a valid regular expression.');
    figureFolders = /(?!)/;
  }
  return {
    figureScript: c.get('figureScript'),
    buildScript: c.get('buildScript'),
    scriptFolders: c.get('scriptFolders'),
    figureFolders,
  };
}

/**
 * Build, and report the outcome as a notification.
 *
 * The script is run directly rather than through a VS Code task. A task spawns a
 * terminal, clears it and reports back through the task-process event, which costs
 * roughly as long again as the build itself -- about two seconds on top of two. Running
 * it here removes all of that. The cost is losing the terminal transcript, which the
 * toast and the log file named in a failure already cover.
 *
 * Falls back to the default build task when no script is found, so the command still
 * does something sensible in a project that has none.
 */
async function runBuildAndReport() {
  try {
    await build();
  } catch (err) {
    // Bound to a key with no terminal behind it, so an unhandled throw would
    // otherwise surface as a bare stack trace with no clue which step failed.
    vscode.window.showErrorMessage(`TikZ build error: ${err?.message ?? err}`);
  }
}

async function build() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    vscode.window.showErrorMessage('TikZ: no folder open, nothing to build.');
    return;
  }

  const plan = await choose(folder.uri);
  if (!plan) {
    await vscode.commands.executeCommand('workbench.action.tasks.build');
    return;
  }

  const started = Date.now();
  const result = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: `${plan.label}…` },
    () => run(plan),
  );
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  const status = await readStatus(plan.cwd);
  if (status && !status.ok) {
    vscode.window.showErrorMessage(`Build failed — ${status.message}`);
  } else if (result.code !== 0) {
    vscode.window.showErrorMessage(`${plan.label} failed (exit ${result.code})`);
  } else {
    const what = status?.message ?? plan.label;
    vscode.window.showInformationMessage(`Built ${what} in ${seconds}s`);
  }
}

/**
 * Decide which script to run, and from where.
 * @param {vscode.Uri} folder
 * @returns {Promise<{script: string, args: string[], cwd: string, label: string} | null>}
 */
async function choose(folder) {
  const { figureScript, buildScript, scriptFolders, figureFolders } = config();

  const active = vscode.window.activeTextEditor?.document;
  const isFigure =
    active?.languageId &&
    /^(latex|tex)$/.test(active.languageId) &&
    figureFolders.test(path.dirname(active.uri.fsPath));

  for (const dir of scriptFolders) {
    const cwd = path.join(folder.fsPath, dir);
    if (isFigure && (await exists(path.join(cwd, figureScript)))) {
      return {
        script: figureScript,
        args: [active.uri.fsPath],
        cwd,
        label: `preview ${path.basename(active.uri.fsPath, '.tex')}`,
      };
    }
    if (await exists(path.join(cwd, buildScript))) {
      return { script: buildScript, args: [], cwd, label: 'build' };
    }
  }
  return null;
}

/** @param {{script: string, args: string[], cwd: string}} plan */
function run(plan) {
  return new Promise((resolve) => {
    execFile(
      plan.script,
      plan.args,
      { cwd: plan.cwd, timeout: TIMEOUT_MS },
      (error) => resolve({ code: error ? (error.code ?? 1) : 0 }),
    );
  });
}

/** @param {string} file */
async function exists(file) {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(file));
    return true;
  } catch {
    return false;
  }
}

/**
 * The scripts leave a one-line summary behind, since their output is not shown anywhere.
 * @param {string} cwd
 * @returns {Promise<{ok: boolean, message: string} | null>}
 */
async function readStatus(cwd) {
  try {
    const uri = vscode.Uri.file(path.join(cwd, 'build', '.build-status'));
    const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8').trim();
    const [verdict, ...rest] = text.split(/\s+/);
    if (verdict !== 'ok' && verdict !== 'fail') return null;
    return { ok: verdict === 'ok', message: rest.join(' ') };
  } catch {
    return null;
  }
}

module.exports = { runBuildAndReport };
