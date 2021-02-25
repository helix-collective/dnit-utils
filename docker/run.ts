import { run, runConsole } from "../process.ts";

export type DockerBindMount = {
  type: "bind";
  source: string;
  target: string;
  readonly?: boolean;
};

export type DockerUserArg = {
  userId: string;
  groupId: string;
};

export type DockerRunParams = {
  cmds: string[];
  mounts?: (DockerBindMount)[];
  user?: DockerUserArg;
  workdir?: string;
  envvars?: string[];
  interactive: boolean;
};

/// Options to run docker as current user
export async function currentUserOpts() {
  const groupId = (await run(["id", "-g"])).trim();
  const userId = (await run(["id", "-u"])).trim();

  const homeDir = Deno.env.get("HOME")!;

  const user: DockerUserArg = {
    userId,
    groupId,
  };

  const mounts: DockerBindMount[] = [
    {
      type: "bind",
      source: "/etc/passwd",
      target: "/etc/passwd",
    },
    {
      type: "bind",
      source: "/etc/group",
      target: "/etc/group",
    },
    {
      type: "bind",
      source: homeDir,
      target: homeDir,
    },
  ];

  return {
    user,
    mounts,
  };
}

/** Build a commandline for docker run */
export function makeDockerRunCmd(
  img: string,
  params: DockerRunParams,
): string[] {
  const cmd = [
    "docker",
    "run",
    "--rm",
  ];

  if (params.interactive) {
    cmd.push("--tty");
    cmd.push("--interactive");
  }

  for (const m of params.mounts || []) {
    if (m.type === "bind") {
      const args = [
        "--mount",
        `type=${m.type},source=${m.source},target=${m.target},readonly=${m
          .readonly || false}`,
      ];
      cmd.push(...args);
    }
  }

  if (params.user) {
    const args = [
      "--user",
      `${params.user.userId}:${params.user.groupId}`,
    ];
    cmd.push(...args);
  }

  if (params.workdir) {
    const args = [
      "--workdir",
      `${params.workdir}`,
    ];
    cmd.push(...args);
  }

  for (const envv of params.envvars || []) {
    const args = [
      "--env",
      envv,
    ];
    cmd.push(...args);
  }

  cmd.push(img);

  for (const c of params.cmds) {
    cmd.push(c);
  }
  return cmd;
}

export async function dockerRunConsole(img: string, params: DockerRunParams) {
  await runConsole(makeDockerRunCmd(img, params));
}
// deno-lint-ignore require-await
export async function dockerRun(
  img: string,
  params: DockerRunParams,
): Promise<string> {
  return run(makeDockerRunCmd(img, params));
}
