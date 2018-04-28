import { Point, TextEditor } from "atom";
import * as path from "path";
import { Datatip } from "types/atom-ide";
import { GoGetDocResponse } from "types/golang";
import { BaseLintTool } from "./baselinttool";
import { ExecError } from "./commons";
import * as utils from "./utils";

export class GoGetDoc extends BaseLintTool {
  public getDatatip(editor: TextEditor, bufferPos: Point, _: MouseEvent | null): Promise<Datatip | null> {
    const m = this.reportBusy("GoGetDoc");
    return new Promise((resolve) => {
      const offset = editor.getBuffer().characterIndexForPosition(bufferPos);
      const filePath = editor.getPath();
      this.spawn(
        "gogetdoc",
        ["-json", "-modified", "-pos=" + filePath + ":#" + offset],
        {
          cwd: filePath && path.dirname(filePath),
          input: utils.getFileArchive(editor),
        },
      ).then((out: string) => {
        const output = JSON.parse(out.toString()) as GoGetDocResponse;
        m.dispose();
        resolve({
          markedStrings: [
            {
              grammar: atom.grammars.grammarForScopeName("source.go") || editor.getGrammar(),
              type: "snippet",
              value: output.decl,
            },
            {
              type: "markdown",
              value: output.doc,
            },
          ],
          range: utils.getCurrentWordBufferRange(editor, bufferPos),
        });
      }).catch((err: Error) => {
        if (err instanceof ExecError) {
          const [messagses, unparsed] = utils.parseLintErrors(err.message);
          if (messagses.length > 0) {
            this.setAllMessages(messagses);
          }
          unparsed.map(this.logTrace.bind(this));
        } else {
          this.logTrace(err);
        }
        m.dispose();
        resolve(null);
       });
    });
  }
}
