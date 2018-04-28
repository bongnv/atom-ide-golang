import { TextEditor } from "atom";
import { ExecError } from "./commons";
import { GoLintTool } from "./golinttool";
import * as utils from "./utils";

export class GoImports extends GoLintTool {
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
        this.clearMessages();
        resolve({
          formatted: out,
        });
      }).catch((err: any) => {
        if (err instanceof ExecError) {
          const [parsed, unparsed] = utils.parseGoImportsErrors(err.message);
          this.setAllMessages(parsed);
          unparsed.map(this.logWarn.bind(this));
        } else {
          this.logWarn(err);
        }
        resolve({
          formatted: editor.getText(),
        });
      });
    });
  }
}
