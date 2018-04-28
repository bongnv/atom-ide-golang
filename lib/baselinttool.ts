import { IndieDelegate, Message } from "atom/linter";
import { GoTool } from "./gotool";

export class BaseLintTool extends GoTool {
  private linter: IndieDelegate | undefined;
  public setLinter(linter: IndieDelegate) {
    this.linter = linter;
  }

  public dispose() {
    super.dispose();
    this.linter = undefined;
  }

  protected clearMessages() {
    if (this.linter) {
      this.linter.clearMessages();
    }
  }

  protected setAllMessages(messages: Message[]) {
    if (this.linter) {
      this.linter.clearMessages();
      if (messages.length > 0) {
        this.linter.setAllMessages(messages);
      }
    }
  }
}
