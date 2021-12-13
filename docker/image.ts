import { TrackedFile } from "../dnit-deps.ts";
import { fs } from "../deps.ts";
import { path } from "../deps.ts";
import { PathName } from "../types.ts";
import { runConsole } from "../process.ts";
import { DnitFileTreeGen, DnitDep } from "../filetree.ts";


export class DockerImage {

  constructor(
    readonly dockerfile: TrackedFile,
    readonly context: DnitFileTreeGen,
    readonly ctxDir: PathName,

  ) {
  }

  dependencies = (): DnitDep[] => {
    return [
      this.dockerfile,
      ...this.context.deps()
    ];
  }

  build = async (tags: string[]): Promise<void> => {
    await fs.emptyDir(this.ctxDir);
    await Deno.copyFile(this.dockerfile.path, path.join(this.ctxDir, 'Dockerfile'));
    await this.context.unpack(this.ctxDir);
    const tagArgs: string[] = [];
    for (const tag of tags) {
      tagArgs.push("-t");
      tagArgs.push(tag);
    }

    // run docker build
    await runConsole([
      "docker",
      "build",
      ...tagArgs,
      ".",
    ], {
      cwd: this.ctxDir,
    });
  }

  buildWithUuid = async (localName: string): Promise<string> => {
    const uuid = crypto.randomUUID()
    const latestTag = localName + ":latest";
    const uuidTag = localName + ":" + uuid;
    const tags = [latestTag,uuidTag];
    await this.build(tags);
    return uuidTag;
  }
}

