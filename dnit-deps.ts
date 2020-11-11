// Dependencies from dnit:

export type {
  TaskContext,
  Action,
  IsUpToDate,
  TaskParams,
  FileParams,
} from "https://deno.land/x/dnit@dnit-v1.8.0/mod.ts";

export {
  Task,
  TrackedFile,

  runAlways,
  file,
  task,
  setupLogging,
  getLogger,
  exec,
  execBasic,
} from "https://deno.land/x/dnit@dnit-v1.8.0/mod.ts";
