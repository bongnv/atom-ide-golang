import { TextEditor } from "atom";
import { ExecError } from "./commons";
import { Core } from "./core";
import { GoTool } from "./gotool";
import * as utils from "./utils";

export class GoImports extends GoTool {
  constructor(core: Core) {
    super(core, "goimports");
  }

  public formatFile(editor: TextEditor, _: Range): Promise<{
    newCursor?: number,
    formatted: string,
  }> {
    return new Promise((resolve) => {
      const filePath = editor.getPath();
      this.spawn(
        "goimports",
        ["-e", "-srcdir=" + filePath],
        {
          cwd: utils.getDirname(editor),
          input: editor.getText(),
        },
      ).then((out: string) => {
        this.core.clearMessages();
        resolve({
          formatted: out,
        });
      }).catch((err: any) => {
        if (err instanceof ExecError) {
          const [parsed, unparsed] = utils.parseLintErrors(err.message);
          this.core.setAllMessages(parsed);
          unparsed.map(this.core.logWarn.bind(this));
        } else {
          this.core.logWarn(err);
        }
        resolve({
          formatted: editor.getText(),
        });
      });
    });
  }
}
