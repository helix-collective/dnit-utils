import { MarkerFile } from "./markerFile.ts";
import { path, uuid } from "./deps.ts";
import { assertEquals, assertNotEquals } from "./test-deps.ts";
import { execBasic, Manifest, task } from "./dnit-deps.ts";

Deno.test("Markerfile", async () => {
  const testDir = path.join(".test", uuid.v4.generate());

  const markerFile = new MarkerFile(path.join(testDir, "markerfile.txt"));
  assertEquals(await markerFile.exists(), false);
  await markerFile.action();
  assertEquals(await markerFile.exists(), true);
  const contents = Deno.readTextFileSync(markerFile.filename);
  await markerFile.action();
  const contents2 = Deno.readTextFileSync(markerFile.filename);
  assertNotEquals(contents, contents2);

  await Deno.remove(testDir, { recursive: true });
});

Deno.test("Markerfile as Target", async () => {
  const testDir = path.join(".test", uuid.v4.generate());

  const markerFile = new MarkerFile(path.join(testDir, "markerfile.txt"));

  const targetTask = task({
    name: "markerfile_target_test",
    description: `markerfile test task`,
    action: async () => {
      await markerFile.action();
    },
    targets: [
      markerFile,
    ],
  });

  const depTask = task({
    name: "markerfile_dep_test",
    description: `markerfile test task`,
    action: () => {
      // nothing
    },
    deps: [
      markerFile,
    ],
  });

  assertEquals(await markerFile.exists(), false);

  const ctx = await execBasic(
    ["markerfile_dep_test"],
    [targetTask, depTask],
    new Manifest(""),
  );
  await ctx.getTaskByName("markerfile_dep_test")?.exec(ctx);

  assertEquals(await markerFile.exists(), true);
});
