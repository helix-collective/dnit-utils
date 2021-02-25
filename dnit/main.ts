import {
  exec,
  runAlways,
  task,
} from "https://deno.land/x/dnit@dnit-v1.12.1/dnit.ts";
import { runConsole } from "../process.ts";

const test = task({
  name: "test",
  description: "Run local tests",
  action: async () => {
    await runConsole(
      [
        "deno",
        "test",
        "--unstable",
        "--allow-read",
        "--allow-write",
        "--allow-run",
      ],
    );
  },
  uptodate: runAlways,
});

exec(Deno.args, [
  test,
]);
