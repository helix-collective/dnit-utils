// Subprocess utils

import { readAllClose, writeAllClose } from "./io.ts";

/** IO options for stdin/stdout/stderr on Deno.run */
export type IoOption = "inherit" | "piped" | "null";

/** IoOption for each of stdin/stdout/stderr */
export interface IoParams {
  stdout: IoOption;
  stderr: IoOption;
  stdin: IoOption;
}

/** Options for execution of processes */
export type ExecOptions = {
  cwd?: string;
  env?: {
    [key: string]: string;
  };
};

/** Params for execution of processes */
export type ExecParams = {
  cmd: string[];
} & ExecOptions;

/** mapping from IoOption to type of data required/expected for stdio */
type ProcessIoValOpts = {
  "piped": string;
  "inherit": null;
  "null": null;
};

type ProcessIoVal<T extends IoOption> = ProcessIoValOpts[T];

export type ProcessResult<Outp extends IoOption, StdErr extends IoOption> = {
  stdout: ProcessIoVal<Outp>;
  stderr: ProcessIoVal<StdErr>;
  status: Deno.ProcessStatus;
};

export async function runProcess<
  Inp extends IoOption,
  Outp extends IoOption,
  StdErr extends IoOption,
>(
  params: {
    in: Inp;
    out: Outp;
    err: StdErr;
    inp: ProcessIoVal<Inp>;
    cmd: string[];
    opts?: ExecOptions;
  },
): Promise<ProcessResult<Outp, StdErr>> {
  const ioOpts: IoParams = {
    stdin: params.in,
    stderr: params.err,
    stdout: params.out,
  };

  const runOpts: Deno.RunOptions = {
    cmd: params.cmd,
    ...params.opts,
    ...ioOpts,
  };

  /// start the process:
  const process = Deno.run(runOpts);

  let stdout: ProcessIoVal<Outp> = null as ProcessIoVal<Outp>;
  let stderr: ProcessIoVal<StdErr> = null as ProcessIoVal<StdErr>;

  const ioJobs: Promise<void>[] = [];
  if (params.in === "piped") {
    /// setup write of process stdin - if requested
    const inputStr: string = params.inp as string;
    ioJobs.push(writeAllClose(inputStr, process.stdin!));
  }
  if (params.err === "piped") {
    ioJobs.push(
      /// setup read of process stderr - if requested
      readAllClose(process.stderr!).then((x) => {
        stderr = x as ProcessIoVal<StdErr>;
      }),
    );
  }
  if (params.out === "piped") {
    ioJobs.push(
      /// setup read of last process stdout - if requested
      readAllClose(process.stdout!).then((x) => {
        stdout = x as ProcessIoVal<Outp>;
      }),
    );
  }

  await Promise.all(ioJobs);
  const status = await process.status();
  process.close();

  return {
    stdout,
    stderr,
    status,
  };
}

/// Short-form run single process: no stdin or sterr - final output as string.
export async function run(cmd: string[], opts?: ExecOptions): Promise<string> {
  const result = await runProcess({
    in: "null",
    out: "piped",
    err: "inherit",
    inp: null,
    cmd,
    opts,
  });
  if (result.status.success !== true) {
    throw new Error(
      `${cmd} - ${result.status.code} - ${result.stderr} - ${result.stdout}`,
    );
  }
  return result.stdout;
}

/// run with stdin, stdout and stderr to parent io
export async function runConsole(
  cmd: string[],
  opts?: ExecOptions,
): Promise<void> {
  const result = await runProcess({
    in: "null",
    out: "inherit",
    err: "inherit",
    inp: null,
    cmd,
    opts,
  });
  if (result.status.success !== true) {
    throw new Error(`${cmd} - ${result.status.code}`);
  }
}
