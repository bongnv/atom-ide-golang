import { BufferedProcess, HandleableErrorEvent } from "atom";
import { SpawnOptions } from "types/golang";
import { ExecError } from "./commons";
import { Core } from "./core";

export class GoTool {
  protected core: Core;
  constructor(core: Core) {
    this.core = core;
  }

  protected spawn(command: string, args: string[], opts?: SpawnOptions): Promise<string> {
    return (new Promise((resolve, reject) => {
      if (!opts) {
        opts = {};
      }
      let stdout = "";
      let stderr = "";
      const exitFn = (code: number) => {
        if (code > 0 || stderr) {
          reject(new ExecError(stderr));
          return;
        }

        resolve(stdout);
      };

      const bp = new BufferedProcess({
        args,
        autoStart: true,
        command,
        exit: exitFn,
        options: {
          cwd: opts.cwd,
          env: this.core.getEnvironments(opts),
        },
        stderr: (data: string) => { stderr += data; },
        stdout: (data: string) => { stdout += data; },
      });

      bp.onWillThrowError((e: HandleableErrorEvent) => {
        if (e.handle) {
          e.handle();
        }
        reject(e.error);
      });

      if (bp.process) {
        if (opts.input && opts.input.length > 0) {
          bp.process.stdin.end(opts.input);
        }
      }
    }));
  }
}
