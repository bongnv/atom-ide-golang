import { BufferedProcess, HandleableErrorEvent } from "atom";
import { IndieDelegate, Message } from "atom/linter";
import * as path from "path";
import { BusyMessage, BusySignalOptions, BusySignalService, ConsoleApi } from "types/atom-ide";
import { SpawnOptions } from "types/golang";
import { ExecError, NoopBusyMessage } from "./commons";
import * as utils from "./utils";

export class Core {
  public busyService: BusySignalService | undefined;
  public console: ConsoleApi | undefined;
  public linter: IndieDelegate | undefined;
  public linters: { [k: string]: IndieDelegate; };
  public linterRegister: ((opts: {name: string}) => IndieDelegate) | undefined;
  public myPackage: string;

  private concurrentProcess: number;

  constructor() {
    this.myPackage = "ide-golang";
    this.linters = {};
    this.concurrentProcess = 0;
  }

  public dispose() {
    this.busyService = undefined;
    this.console = undefined;
    this.linters = {};
    this.linterRegister = undefined;
    this.concurrentProcess = 0;
  }

  public spawn(command: string, args: string[], opts?: SpawnOptions): Promise<string> {
    if (this.concurrentProcess >= this.getConfig("maxConcurrency")) {
      return Promise.reject(new Error("Max concurrency exceeded."));
    }

    return (new Promise((resolve, reject) => {
      if (!opts) {
        opts = {};
      }
      let stdout = "";
      let stderr = "";
      const exitFn = (code: number) => {
        if (this.concurrentProcess > 0) {
          this.concurrentProcess--;
        }
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
          env: this.getEnvironments(opts.cwd),
        },
        stderr: (data: string) => { stderr += data; },
        stdout: (data: string) => { stdout += data; },
      });
      bp.onWillThrowError((e: HandleableErrorEvent) => {
        if (e.handle) {
          e.handle();
        }

        // if(e.error && (<any>e.error).code === "ENOENT") {
        //   utils.promptForMissingTool(this.name);
        // }
        if (this.concurrentProcess > 0) {
          this.concurrentProcess--;
        }
        reject(e.error);
      });

      if (bp.process) {
        if (opts.input && opts.input.length > 0) {
          bp.process.stdin.end(opts.input);
        }
      }
      this.concurrentProcess++;
    }));
  }

  public reportBusy(title: string, options?: BusySignalOptions): BusyMessage {
    if (this.busyService) {
      return this.busyService.reportBusy(title, options);
    }
    return new NoopBusyMessage();
  }

  public logTrace(err: any) {
    if (this.console) {
      this.console.log(String(err));
    }
  }

  public logWarn(err: any) {
    if (this.console) {
      this.console.warn(String(err));
    }
  }

  public clearMessages() {
    if (this.linter) {
      this.linter.clearMessages();
    }
  }

  public setAllMessages(messages: Message[]) {
    if (this.linter) {
      this.linter.clearMessages();
      if (messages.length > 0) {
        this.linter.setAllMessages(messages);
      }
    }
  }

  public promptForMissingTool(tool: string) {
    atom.notifications.addWarning("Missing tool: " + tool);
  }

  private getEnvironments(p: string | undefined): {[x: string]: string} {
    const env: {[x: string]: string} = {};
    for (const key of Object.keys(process.env)) {
      const value = process.env[key];
      if (value) {
        env[key] = value;
      }
    }

    const paths: string[] = [];
    const goPath = env.GOPATH || this.getGoPath() || utils.goPathFromPath(p);
    if (goPath) {
      env.GOPATH = goPath;
      paths.push(path.resolve(goPath, "bin"));
    }

    const goRoot = env.GOROOT || this.getGoRoot();
    paths.push(
      path.resolve(goRoot, "bin"),
      env.PATH,
    );

    return {
      ...env,
      GOROOT: goRoot,
      PATH: paths.join(":"),
    };
  }

  private getGoPath(): string | undefined {
    const goPath = this.getConfig("gopath") as string;
    return (goPath && goPath.trim().length > 0) ? goPath : undefined;
  }

  private getGoRoot(): string {
    const goRoot = this.getConfig("goroot") as string;
    return (goRoot && goRoot.trim().length > 0) ? goRoot : "/usr/local/go";
  }

  private getConfig(key: string): any {
    return atom.config.get(this.myPackage + "." + key);
  }
}
