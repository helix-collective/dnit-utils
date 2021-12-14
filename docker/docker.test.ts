import { DockerImage } from "./image.ts";
import { path, uuid } from "../deps.ts";
import { file } from "../dnit-deps.ts";
import { assertEquals } from "../test-deps.ts";
import { run } from "../process.ts";
import * as FT from "../filetree.ts";


Deno.test("DockerImage test", async () => {
  const testDir = path.join(".test", uuid.v4.generate());
  const ctxDir = path.join(testDir, "docker_ctxdir");

  const dockerfile = file('Dockerfile');
  const testmsg = "testmsg" + uuid.v4.generate();

  const context = FT.fileTree([
    FT.fileWithContent("test/helloworld.txt", testmsg),
  ]);
  const dockerImage = new DockerImage(
    dockerfile,
    context,
    ctxDir,
  );
  await dockerImage.build(["testdnitdocker_test"]);

  const chk = await run(
    ["docker", "run", "testdnitdocker_test", "cat", "/tmp/helloworld.txt"],
  );
  assertEquals(chk, testmsg);
  await Deno.remove(testDir, { recursive: true });
});
