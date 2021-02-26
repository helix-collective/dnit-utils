import { assertEquals, assertThrowsAsync } from "./test-deps.ts";

import { run, runConsole, runProcess } from "./process.ts";

Deno.test("Process - stdin stdout", async () => {
  const res = await runProcess({
    in: "piped",
    out: "piped",
    err: "inherit",
    inp: "hello world",
    cmd: ["cat"],
  });

  assertEquals(res.stdout, "hello world");
  assertEquals(res.status.success, true);

  const res2 = await runProcess({
    in: "piped",
    out: "inherit",
    err: "piped",
    inp: "hello world",
    cmd: ["/bin/sh", "-c", "cat 1>&2"],
  });

  assertEquals(res2.stderr, "hello world");
  assertEquals(res2.status.success, true);
});

Deno.test("Process - inherit", async () => {
  const res = await runProcess({
    in: "piped",
    out: "inherit",
    err: "inherit",
    inp: "hello world",
    cmd: ["cat"],
  });

  // output went to parent process stdout
  assertEquals(res.status.success, true);
});

Deno.test("Process - runConsole", async () => {
  await runConsole(["echo", "helloworld"]);
});

Deno.test("Process - runConsole throws on failure", async () => {
  await assertThrowsAsync(async () => {
    // the process called "false" that always fails
    await runConsole(["false"]);
  });
});

Deno.test("Process - run", async () => {
  const str = await run(["echo", "hello world"]);
  assertEquals(str.trim(), "hello world");
});

Deno.test("Process - run throws on failure", async () => {
  await assertThrowsAsync(async () => {
    // the process called "false" that always fails
    await run(["false"]);
  });
});

/*  These tests work on a console but on CI the input isn't itself a TTY so test fails.
/// test that runConsole passes stdin, stdout and stderr
/// So that the inner process can operate as a terminal
Deno.test('Process - runConsole - is a tty', async () => {
  await runConsole(['test','-t', '0']);
  await runConsole(['test','-t', '1']);
  await runConsole(['test','-t', '2']);
});
Deno.test('Process - runConsole - docker run -ti', async () => {
  await runConsole(['docker','run','-ti','debian','echo','foo']);
});
*/
