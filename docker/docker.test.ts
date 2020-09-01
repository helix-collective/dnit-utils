import { DockerImage } from "./image.ts";
import { fs, path, uuid } from "../deps.ts";
import { file } from "../dnit-deps.ts";
import { assertEquals } from "../test-deps.ts";
import { run } from "../process.ts";

Deno.test("DockerImage setup test", async () => {
  const testDir = path.join(".test", uuid.v4.generate());
  const ctxDir = path.join(testDir, "docker_ctxdir");
  const markerDir = path.join(testDir, "built");
  const dockerImage = new DockerImage("test", "test", ctxDir, markerDir);

  const foo = file({ path: path.join(testDir, "foo.txt") });
  await Deno.mkdir(path.dirname(foo.path), { recursive: true });
  await Deno.writeTextFile(foo.path, "foo contents");

  const tree = path.join(testDir, "tree");
  {
    await Deno.mkdir(tree, { recursive: true });
    await Deno.writeTextFile(path.join(tree, "foo.txt"), "foo tree contents");
    await Deno.mkdir(path.join(tree, "subdir"), { recursive: true });
    await Deno.writeTextFile(
      path.join(tree, "subdir", "foo.txt"),
      "foo tree contents",
    );
  }

  dockerImage.addFile(foo, "foo.txt");
  dockerImage.addFileContent("bar contents", "bar.txt");
  dockerImage.addFileTree(tree, "tree/treedir");

  await dockerImage.copyToCtx();

  console.log("checking exists " + path.join(ctxDir, "bar.txt"));

  assertEquals(fs.existsSync(path.join(ctxDir, "foo.txt")), true);
  assertEquals(fs.existsSync(path.join(ctxDir, "bar.txt")), true);
  assertEquals(
    fs.existsSync(path.join(ctxDir, "tree/treedir", "foo.txt")),
    true,
  );
  assertEquals(
    fs.existsSync(path.join(ctxDir, "tree/treedir", "subdir", "foo.txt")),
    true,
  );

  assertEquals(
    Deno.readTextFileSync(path.join(ctxDir, "foo.txt")),
    "foo contents",
  );
  assertEquals(
    Deno.readTextFileSync(path.join(ctxDir, "bar.txt")),
    "bar contents",
  );
  assertEquals(
    Deno.readTextFileSync(path.join(ctxDir, "tree/treedir", "foo.txt")),
    "foo tree contents",
  );
  assertEquals(
    Deno.readTextFileSync(
      path.join(ctxDir, "tree/treedir", "subdir", "foo.txt"),
    ),
    "foo tree contents",
  );

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("DockerImage test", async () => {
  const testDir = path.join(".test", uuid.v4.generate());
  const ctxDir = path.join(testDir, "docker_ctxdir");
  const markerDir = path.join(testDir, "built");
  const dockerImage = new DockerImage(
    "testdnitdocker",
    "test",
    ctxDir,
    markerDir,
  );
  const testmsg = "testmsg" + uuid.v4.generate();
  dockerImage.addFileContent(testmsg, "test/helloworld.txt");
  dockerImage.fromImage("ubuntu", "18.04");
  dockerImage.addCmd("COPY test/helloworld.txt /tmp");

  await dockerImage.action();

  const chk = await run(
    ["docker", "run", "testdnitdocker_test", "cat", "/tmp/helloworld.txt"],
  );
  assertEquals(chk, testmsg);
  await Deno.remove(testDir, { recursive: true });
});
