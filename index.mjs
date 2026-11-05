import { realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

export const name = 'subproject-skills';
export const inject = ['skills'];

// Only the first directory below the configured workspace is a subproject.
// Canonical paths prevent ../ and symlinked workspace aliases from mixing projects.
export async function projectFor(workspace, cwd) {
  if (!cwd || !isAbsolute(cwd)) return undefined;
  let current;
  try { current = await realpath(cwd); }
  catch (error) {
    if (['ENOENT', 'ENOTDIR'].includes(error.code)) return undefined;
    throw error;
  }
  const child = relative(workspace, current);
  if (!child || isAbsolute(child) || child === '..' || child.startsWith(`..${sep}`)) return undefined;
  const segment = child.split(sep)[0];
  if (segment.startsWith('.') || segment === 'tmp') return undefined;
  return join(workspace, segment);
}

// Composition uses the native provider's public methods, not its private roots().
// Native parsing, invocation policy, resource paths, filesystem service and
// change notification behavior remain authoritative.
export class SubprojectSkillProvider {
  name = name;
  delegates = new Map();
  disposed = false;

  constructor(ctx, control, config, NativeProvider, workspace) {
    this.ctx = ctx;
    this.control = control;
    this.config = config;
    this.NativeProvider = NativeProvider;
    this.workspace = workspace;
    this.onAbort = () => { void this.dispose(); };
    control.signal.addEventListener('abort', this.onAbort, { once: true });
  }

  delegate(project) {
    if (this.disposed || this.control.signal.aborted) throw new Error('Subproject skills provider disposed');
    let entry = this.delegates.get(project);
    if (!entry) {
      const lifecycle = new AbortController();
      const roots = ['.dsh/skills', '.agents/skills'];
      const provider = new this.NativeProvider(this.ctx, {
        signal: lifecycle.signal,
        invalidate: () => this.control.invalidate(),
      }, {
        providerName: name,
        includeDefaultRoots: false,
        customSkillDirs: roots.map(root => join(project, root)),
        watch: this.config.watch ?? true,
      });
      entry = { provider, lifecycle };
      this.delegates.set(project, entry);
    }
    return entry.provider;
  }

  async list(options = {}) {
    options.signal?.throwIfAborted();
    const project = await projectFor(this.workspace, options.cwd);
    if (!project) return [];
    const observation = await this.delegate(project).list(options);
    const candidates = Array.isArray(observation) ? observation : observation.candidates;
    const mapped = candidates.map(candidate => ({
      ...candidate,
      source: 'subproject',
      rank: relative(project, candidate.locator.path).split(sep)[0] === '.dsh' ? 50 : 60,
      locator: { project, original: candidate },
    }));
    return Array.isArray(observation) ? mapped : { ...observation, candidates: mapped };
  }

  async get(candidate, options = {}) {
    options.signal?.throwIfAborted();
    const project = await projectFor(this.workspace, options.cwd);
    if (!project || candidate.locator?.project !== project) return undefined;
    const loaded = await this.delegate(project).get(candidate.locator.original, options);
    return loaded ? { ...loaded, provider: name, source: 'subproject' } : undefined;
  }

  observeHostMutation(path) {
    for (const { provider } of this.delegates.values()) provider.observeHostMutation(path);
  }

  dispose() {
    if (this.disposal) return this.disposal;
    this.disposed = true;
    this.control.signal.removeEventListener('abort', this.onAbort);
    const entries = [...this.delegates.values()];
    this.delegates.clear();
    for (const { lifecycle } of entries) lifecycle.abort();
    this.disposal = Promise.all(entries.map(({ provider }) => provider.dispose()));
    return this.disposal;
  }
}

export async function apply(ctx, config) {
  if (!config?.workspaceRoot || !config?.filesystemModule) {
    throw new Error('subproject-skills needs workspaceRoot and filesystemModule; run install.cjs');
  }
  const { FileSystemSkillProvider } = await import(pathToFileURL(resolve(config.filesystemModule)).href);
  if (typeof FileSystemSkillProvider !== 'function') throw new Error('Unsupported DSH filesystem provider API');
  const workspace = await realpath(config.workspaceRoot);
  let provider;
  ctx.skills.registerProvider(control => {
    provider = new SubprojectSkillProvider(ctx, control, config, FileSystemSkillProvider, workspace);
    return provider;
  });
  ctx.effect(function* () {
    yield () => provider.dispose();
  }, 'Subproject skill watchers');
  ctx.on('fs/observed', (target, _observation, actor) => {
    if (actor?.name === 'write' || actor?.name === 'edit') provider.observeHostMutation(target.displayPath);
  });
}
