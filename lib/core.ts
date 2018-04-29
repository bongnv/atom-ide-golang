import { IndieDelegate, Message } from "atom/linter";
import * as path from "path";
import { BusyMessage, BusySignalOptions, BusySignalService, ConsoleApi } from "types/atom-ide";
import { SpawnOptions } from "types/golang";
import { NoopBusyMessage } from "./commons";
import * as utils from "./utils";

export class Core {
  public busyService: BusySignalService | undefined;
  public console: ConsoleApi | undefined;
  public linter: IndieDelegate | undefined;

  private myPackage: string;

  constructor() {
    this.myPackage = "ide-golang";
  }

  public dispose() {
    this.busyService = undefined;
    this.console = undefined;
    this.linter = undefined;
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

  public getEnvironments(opts: SpawnOptions): {[x: string]: string} {
    const env: {[x: string]: string} = {};
    for (const key of Object.keys(process.env)) {
      const value = process.env[key];
      if (value) {
        env[key] = value;
      }
    }

    const paths: string[] = [];
    const goPath = env.GOPATH || this.getGoPath() || (opts.cwd && utils.goPathFromPath(opts.cwd));
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
