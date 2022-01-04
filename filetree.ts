import {path} from "./deps.ts";
import {fs} from "./deps.ts";
import {file, TrackedFile, Task, TrackedFilesAsync} from "./dnit-deps.ts";

/**
 * A type that knows how to unpack files to a directory tree, and records
 * depenencies of type D
 **/
export interface FileTreeGen<D> {
  /**
   * Write the tree to the filesystem at the specified path
   */
  unpack(toPath: string): Promise<void>;

  /**
   * Returns the dependencies of this filetree
   */
  deps(): D[];
}

export interface FileOptions {
  executable?: boolean
}

export interface TrackedFileOptions extends FileOptions {
  modifier?: AsyncContentModifier
}

/**
 *  A async function that modifies file content
 */
export type AsyncContentModifier = (content:string) => Promise<string>;


/**
 * A single file, sourced from a dnit TrackedFile
 */
export function trackedFile(targetpath: string, srcpath: TrackedFile, options?: TrackedFileOptions) : DnitFileTreeGen {
  async function unpack(toPath: string) {
    const tpath =  path.join(toPath, targetpath);
    await fs.ensureDir(path.dirname(tpath));
    if (options?.modifier) {
      let content = await Deno.readTextFile(srcpath.path);
      content = await options.modifier(content);
      await Deno.writeTextFile(tpath, content);
    } else {
      await Deno.copyFile( srcpath.path, tpath);
    }
    await setExecutable(tpath, options?.executable || false);
  }

  
  function deps() {
    return [srcpath];
  }

  return {unpack, deps};
}

/**
 * A tree of files
 */
 export function trackedFileTree(targetpath: string, srcroot: string) : DnitFileTreeGen {
  async function unpack(toPath: string) {
    const files = await walkFileTree();
    for (const fe of files) {
      const src = fe.path;
      const rpath = path.relative(srcroot,src);
      const target = path.resolve(toPath, targetpath, rpath);
      await fs.ensureDir(path.dirname(target));
      await Deno.copyFile(src, target);
    }
  }

  async function walkFileTree(): Promise<TrackedFile[]> {
    if (!await fs.exists(srcroot)) {
      throw new Error(`Directory ${srcroot} does not exist`);
    }
    const res: TrackedFile[] = [];
    for await (const entry of fs.walk(srcroot)) {
      if (!entry.isDirectory) {
        res.push(file(entry.path));
      }
    }
    return res;
  }

  
  function deps() {
    return [new TrackedFilesAsync(walkFileTree)];
  }

  return {unpack, deps};
}

/**
 * A tree of files sourced from a zip archive
 */
export function trackedZipTree(targetpath: string, zippath: TrackedFile) : DnitFileTreeGen {
  async function unpack(toPath: string) {
    const tpath = path.join(toPath, targetpath);
    await fs.ensureDir(tpath);

    const opt = {
      cmd: ['unzip', '-q', zippath.path, '-d', tpath],
    };
    const status = await Deno.run(opt).status();
    if (!status.success) {
      throw new Error("subprocess failed: " + opt.cmd.join(' '));
    }
  }

  
  function deps() {
    return [zippath];
  }

  return {unpack, deps};
}


/**
 * A single text file with the specified content
 * */
export function fileWithContent(targetpath: string, content: string, options?: FileOptions) : DnitFileTreeGen {
  async function unpack(toPath: string) {
    const tpath =  path.join(toPath, targetpath);
    await fs.ensureDir(path.dirname(tpath));
    await Deno.writeTextFile(tpath, content);
    await setExecutable(tpath, options?.executable || false);

  }

  function deps() {
    return [];
  }

  return {unpack, deps};
}


/**
 * Compose multiple filetrees into a single one
 */
 export function fileTree<D>(ftgens: FileTreeGen<D>[]): FileTreeGen<D> {
  async function unpack(toPath: string): Promise<void> {
    for(const ftg of ftgens) {
      await ftg.unpack(toPath);
    }
  }

  function deps(): D[] {
    return ([] as D[]).concat.apply([], ftgens.map(ftg => ftg.deps()));
  }

  return {unpack, deps};
}

/**
 * Write a filetree to a zip file
 */
export async function writeZip<D>(zippath: string, tree:  FileTreeGen<D>) {
  const abszippath =  path.resolve(Deno.cwd(), zippath);
  await fs.ensureDir(path.dirname(zippath));
  const tmpdir = await Deno.makeTempDir();
  await tree.unpack(tmpdir);
  const rootpaths: string[] = [];
  for await (const de of  Deno.readDir(tmpdir)) {
    rootpaths.push(de.name);
  }
  const opt = {
    cmd: ['zip', '-q', abszippath, ...rootpaths],
    cwd: tmpdir,
  };
  const status = await Deno.run(opt).status();
  await Deno.remove(tmpdir, {recursive:true});
  if (!status.success) {
    throw new Error("subprocess failed: " + opt.cmd.join(' '));
  }
}




/**
 * Make a file executable if it is readable.
 */ 
async function setExecutable(path: string, executable: boolean) {
  const status = await Deno.stat(path);
  const mode = status.mode || 0x600;
  for (const rmask of [0o400, 0o040, 0x004]) {
    const xmask = rmask >> 2;
    await Deno.chmod(path, executable ? (mode | xmask) : (mode & ~xmask));
  }
}

export type DnitDep = TrackedFile |  Task |  TrackedFilesAsync;
export type DnitFileTreeGen = FileTreeGen<DnitDep>;
