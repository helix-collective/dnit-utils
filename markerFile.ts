import { PathName } from "./types.ts";
import { TrackedFile } from "./dnit-deps.ts";
import { path, uuid } from "./deps.ts";

/** Util for a file that rewrites itself with random contents to act as a target representing an external action
 * (eg an image uploaded to docker)
 *  Use as a target of a task that executes remote actions
 *  Use as a dependency of other tasks that need that action to happen
 * */
export class MarkerFile extends TrackedFile {
  constructor(public filename: PathName) {
    super({
      path: filename,
    });
  }

  async action() {
    await this.writeUuid();
  }

  async writeUuid() {
    await Deno.mkdir(path.dirname(this.filename), {
      recursive: true,
    });
    const uuidval = uuid.v4.generate();
    await Deno.writeTextFile(this.filename, uuid.v4.generate());
  }
}
