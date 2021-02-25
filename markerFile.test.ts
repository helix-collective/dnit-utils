import { MarkerFile } from "./markerFile.ts";
import { path, uuid } from "./deps.ts";
import { assertNotEquals } from "./test-deps.ts";

Deno.test("Markerfile", async () => {
  const testDir = path.join(".test", uuid.v4.generate());

  const markerFile = new MarkerFile(path.join(testDir, "markerfile.txt"));
  await markerFile.action();
  const contents = Deno.readTextFileSync(markerFile.filename);
  await markerFile.action();
  const contents2 = Deno.readTextFileSync(markerFile.filename);
  assertNotEquals(contents, contents2);

  await Deno.remove(testDir, { recursive: true });
});
