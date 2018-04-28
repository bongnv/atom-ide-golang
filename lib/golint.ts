import { TextEditor } from "atom";
import { BaseLintTool } from "./baselinttool";
import * as utils from "./utils";

export class GoLint extends BaseLintTool {
  public lintCheck(editor: TextEditor | undefined): Promise<void> {
    if (!editor) {
      atom.notifications.addWarning("Ops, no editor is active, cannot find current package to lint");
      return Promise.resolve();
    }

    const m = this.reportBusy("GoLint");
    const dirName = utils.getDirname(editor);
    const args: string[] = [];
    const filePath = editor.getPath();
    if (filePath) {
      args.push(filePath);
    }
    return new Promise((resolve) => {
      this.spawn(
        "golint",
        args,
        {
          cwd: dirName,
        },
      ).then((out: string) => {
        const [messages, others] = utils.parseLintErrors(out, dirName);
        this.setAllMessages(messages);
        others.map(this.logWarn.bind(this));
        m.dispose();
        resolve();
      }).catch((err) => {
        m.dispose();
        this.logWarn(err);
        resolve();
      });
    });
  }
}
