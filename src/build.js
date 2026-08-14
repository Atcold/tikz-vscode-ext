'use strict';

const vscode = require('vscode');

// The folder opened in the editor may be the repository root or the latex/ directory
// inside it, so look for the status file in both.
const STATUS_FILES = ['build/.build-status', 'latex/build/.build-status'];

/**
 * Run the workspace's default build task and report the outcome as a notification.
 *
 * A task cannot raise a notification on its own, and the build is bound to a key with a
 * silent panel, so without this there is nothing to say it finished. The task's own
 * output is not readable through the API either, so the script leaves a one-line summary
 * at build/.build-status and this reads it back. If that file is absent the exit code
 * still gives a usable message, so this works for any build task.
 */
async function runBuildAndReport() {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    vscode.window.showErrorMessage('TikZ: no folder open, nothing to build.');
    return;
  }

  const started = Date.now();

  const finished = new Promise((resolve) => {
    const sub = vscode.tasks.onDidEndTaskProcess((e) => {
      sub.dispose();
      resolve(e.exitCode ?? 0);
    });
    // Nothing should hang the editor if the task never reports.
    setTimeout(() => {
      sub.dispose();
      resolve(null);
    }, 10 * 60 * 1000);
  });

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: 'Building…' },
    async () => {
      await vscode.commands.executeCommand('workbench.action.tasks.build');
      await finished;
    },
  );

  const exitCode = await finished;
  const seconds = Math.round((Date.now() - started) / 1000);
  const status = await readStatus(folder.uri);

  if (status?.ok === false) {
    vscode.window.showErrorMessage(`Build failed — ${status.message}`);
  } else if (status?.ok === true) {
    vscode.window.showInformationMessage(`Built — ${status.message}`);
  } else if (exitCode === 0) {
    vscode.window.showInformationMessage(`Built in ${seconds}s`);
  } else if (exitCode === null) {
    vscode.window.showWarningMessage('Build did not report a result.');
  } else {
    vscode.window.showErrorMessage(`Build failed (exit ${exitCode})`);
  }
}

/**
 * @param {vscode.Uri} folder
 * @returns {Promise<{ok: boolean, message: string} | null>}
 */
async function readStatus(folder) {
  for (const relative of STATUS_FILES) {
    try {
      const uri = vscode.Uri.joinPath(folder, relative);
      const text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8').trim();
      const [verdict, ...rest] = text.split(/\s+/);
      if (verdict === 'ok' || verdict === 'fail') {
        return { ok: verdict === 'ok', message: rest.join(' ') };
      }
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

module.exports = { runBuildAndReport };
