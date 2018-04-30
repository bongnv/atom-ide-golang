import { TextEditor } from "atom";
import { Core } from "./core";
import { GoTool } from "./gotool";
import * as utils from "./utils";

export class GoLint extends GoTool {
  constructor(core: Core) {
    super(core, "golint");
  }

  public lintCheck(editor: TextEditor | undefined): Promise<void> {
    if (!editor) {
      atom.notifications.addWarning("Ops, no editor is active, cannot find current package to lint");
      return Promise.resolve();
    }

    const m = this.core.reportBusy("GoLint");
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
        this.core.setAllMessages(messages);
        others.map(this.core.logWarn.bind(this));
        m.dispose();
        resolve();
      }).catch((err) => {
        m.dispose();
        this.core.logWarn(err);
        resolve();
      });
    });
  }
}
