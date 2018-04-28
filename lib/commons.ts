import { BusyMessage } from "types/atom-ide";
/* tslint:disable:max-classes-per-file */
/* tslint:disable:no-empty */
export class NoopBusyMessage implements BusyMessage {
  public setTitle(_: string): void {}
  public dispose(): void {}
}

export class ExecError extends Error {
  constructor(message?: string) {
    super(message);
  }
}
