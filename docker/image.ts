import { file, TrackedFile } from "../dnit-deps.ts";

import { fs, path } from "../deps.ts";
import { Newtype } from "../newtype.ts";
import { MarkerFile } from "../markerFile.ts";
import { PathName } from "../types.ts";
import { runConsole } from "../process.ts";

/// Paths in the docker context
export type InContextPathName = Newtype<string, "InContextPathName">;

interface ContextItem {
  dependencies(): Promise<TrackedFile[]>;
  copyTo(ctxDir: PathName): Promise<void> | void;
} /// A single file copied to the docker context

class ContextFile implements ContextItem {
  constructor(
    readonly src: TrackedFile,
    readonly inCtxDest: InContextPathName,
  ) {
  }

  // deno-lint-ignore require-await
  async dependencies() {
    return [this.src];
  }
  async copyTo(ctxDir: PathName) {
    const destfile = path.join(ctxDir, this.inCtxDest);
    const destdir = path.dirname(destfile);
    await Deno.mkdir(destdir, {
      recursive: true,
    });
    await fs.copy(this.src.path, destfile);
  }
}

/// A single file (given by literal contents) copied to the docker context
class ContextFileContent implements ContextItem {
  constructor(
    readonly content: string,
    readonly inCtxDest: InContextPathName,
    readonly deps: TrackedFile[] = [],
  ) {}

  // deno-lint-ignore require-await
  async dependencies() {
    return this.deps;
  }
  async copyTo(ctxDir: PathName) {
    const destfile = path.join(ctxDir, this.inCtxDest);
    const destdir = path.dirname(destfile);
    await Deno.mkdir(destdir, {
      recursive: true,
    });
    await Deno.writeTextFile(destfile, this.content);
  }
}

/// A file tree copied to the docker context
class ContextFileTree implements ContextItem {
  #contents: PathName[] | null = null;

  constructor(
    readonly src: PathName,
    readonly inCtxDest: InContextPathName,
    readonly argdeps: TrackedFile[] | null = null,
  ) {
  }

  private async walkFileTree(): Promise<PathName[]> {
    const res: PathName[] = [];
    for await (const entry of fs.walk(this.src)) {
      if (!entry.isDirectory) {
        res.push(entry.path);
      }
    }
    return res;
  }

  private async getContents(): Promise<PathName[]> {
    if (this.#contents === null) {
      this.#contents = await this.walkFileTree();
    }
    return this.#contents;
  }

  async dependencies() {
    if (this.argdeps !== null) {
      return this.argdeps;
    }
    const files: TrackedFile[] = (await this.getContents()).map((i) => file(i));
    return files;
  }

  async copyTo(ctxDir: PathName) {
    const destdir = path.join(ctxDir, this.inCtxDest);
    await fs.copy(this.src, destdir);
  }
}

export class DockerImage {
  items: ContextItem[] = [];
  instructions: string[] = [];

  localName: string;
  remoteName: string;
  markerfile: MarkerFile;

  constructor(
    readonly project: string,
    name: string,
    readonly ctxDir: PathName,
    readonly markerBuiltDir: PathName,
  ) {
    this.localName = project + "_" + name;
    this.remoteName = project + "/" + name;
    this.markerfile = new MarkerFile(
      path.join(markerBuiltDir, `${project}_${name}_built`),
    );
  }

  /// Add noop dependencies
  addDeps(deps: TrackedFile[]) {
    this.items.push({
      // deno-lint-ignore require-await
      dependencies: async () => deps,
      copyTo: () => {},
    });
  }

  /// Add a single file to the context
  addFile(src: TrackedFile, dest: InContextPathName) {
    this.items.push(new ContextFile(src, dest));
  }

  /// Add a file to the context with the given content
  addFileContent(
    content: string,
    dest: InContextPathName,
    deps: TrackedFile[] = [],
  ) {
    this.items.push(new ContextFileContent(content, dest, deps));
  }

  /// Add a file tree to the context
  addFileTree(
    src: PathName,
    dest: InContextPathName,
    deps: TrackedFile[] = [],
  ) {
    this.items.push(new ContextFileTree(src, dest, deps));
  }

  /// Add a command to the dockerfile
  addCmd(instruction: string) {
    this.instructions.push(instruction);
  }

  /// Add "FROM img:version" to the dockerfile
  fromImage(img: string, version: string) {
    this.addCmd(`FROM ${img}:${version}`);
  }

  /// add sequence of cmds within a single docker RUN
  addRunCmds(cmds: string[]) {
    this.addCmd("RUN " + cmds.join(" && "));
  }

  /// (ubuntu/debian apt) fetch keys from a URL
  aptFetchKeys(url: string) {
    this.addRunCmds([
      `apt-key adv --fetch-keys ${url} 2>/dev/null 1>/dev/null`,
    ]);
  }

  /// (ubuntu/debian apt) apt-get install packages
  aptGetInstall(packages: string[]) {
    this.addRunCmds(
      [
        "apt-get update -qq",
        "apt-get install -qq -y --no-install-recommends " + packages.join(" "),
      ],
    );
  }

  /// (ubuntu/debian apt) add an APT source
  aptAddSource(src: string, name: string) {
    this.addRunCmds([
      `echo "${src}" | tee /etc/apt/sources.list.d/${name}.list`,
    ]);
  }

  /// execute a bash script from a URL
  addBashScriptUrl(url: string) {
    this.addRunCmds([
      `curl -sL ${url} | bash -`,
    ]);
  }

  async dependencies(): Promise<TrackedFile[]> {
    const res: TrackedFile[] = [];
    for (const i of this.items) {
      const deps = await i.dependencies();
      res.push(...deps);
    }
    return res;
  }

  async action(): Promise<void> {
    await this.createImage();
    await this.markerfile.action();
  }

  async createImage(): Promise<void> {
    await fs.emptyDir(this.ctxDir);
    await this.copyToCtx();

    // Write the dockerfile
    const dockerfilestr = this.instructions.join("\n") + "\n";
    await Deno.writeTextFile(
      path.join(this.ctxDir, "Dockerfile"),
      dockerfilestr,
    );

    // run docker build
    await runConsole([
      "docker",
      "build",
      "-t",
      this.localName,
      ".",
    ], {
      cwd: this.ctxDir,
    });
  }

  async copyToCtx() {
    await Promise.all(this.items.map((i) => i.copyTo(this.ctxDir)));
  }
}
