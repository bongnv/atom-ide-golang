import { BufferedProcess, HandleableErrorEvent } from "atom";
import { BusyMessage, BusySignalOptions, BusySignalService, ConsoleApi } from "types/atom-ide";
import { SpawnOptions } from "types/golang";
import { ExecError, NoopBusyMessage } from "./commons";
import * as utils from "./utils";

export class GoTool {
  public goRoot: string;
  public goPath: string | undefined;
  protected console: ConsoleApi | undefined;
  protected busyService: BusySignalService | undefined;

  constructor() {
      this.goRoot = "/usr/local/go";
  }

  public dispose() {
    this.console = undefined;
    this.busyService = undefined;
  }

  public setConsole(console: ConsoleApi) {
    this.console = console;
  }

  public setBusyService(busyService: BusySignalService) {
    this.busyService = busyService;
  }

  protected reportBusy(title: string, options?: BusySignalOptions): BusyMessage {
    if (this.busyService) {
      return this.busyService.reportBusy(title, options);
    }
    return new NoopBusyMessage();
  }

  protected logTrace(err: any) {
    if (this.console) {
      this.console.log(String(err));
    }
  }

  protected logWarn(err: any) {
    if (this.console) {
      this.console.warn(String(err));
    }
  }

  protected spawn(command: string, args: string[], opts?: SpawnOptions): Promise<string> {
    return (new Promise((resolve, reject) => {
      if (!opts) {
        opts = {};
      }
      let stdout = "";
      let stderr = "";
      const exitFn = (code: number) => {
          // console.log('exited with code: ' + code)
          // console.log('stderr: ' + stderr)
          // console.log('stdout: ' + stdout)
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
          env: this.getEnvironments(opts),
        },
        stderr: (data: string) => { stderr += data; },
        stdout: (data: string) => { stdout += data; },
      });

      bp.onWillThrowError((e: HandleableErrorEvent) => {
        if (e) {
          if (e.handle) {
            e.handle();
          }
          reject(e.error);
        }
      });

      if (bp.process) {
        if (opts.input && opts.input.length > 0) {
          bp.process.stdin.end(opts.input);
        }
      }
    }));
  }

  private getEnvironments(opts: SpawnOptions): {[x: string]: string} {
    const env: {[x: string]: string} = {};
    for (const key of Object.keys(process.env)) {
      const value = process.env[key];
      if (value) {
        env[key] = value;
      }
    }

    const goPath = this.goPath || env.GOPATH || (opts.cwd && utils.goPathFromPath(opts.cwd));
    if (goPath) {
      env.GOPATH = goPath;
    }

    const goRoot = env.GOROOT || this.goRoot;
    const paths = [
      goPath + "/bin",
      goRoot + "/bin",
      env.PATH,
    ];
    return {
      ...env,
      GOROOT: goRoot,
      PATH: paths.join(":"),
    };
  }
}
