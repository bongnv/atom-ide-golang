import { Point, TextEditor } from "atom";
import * as path from "path";
import { Datatip } from "types/atom-ide";
import { GoGetDocResponse } from "types/golang";
import { Core } from "./core";
import * as utils from "./utils";

export class GoGetDoc {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public getDatatip(editor: TextEditor, bufferPos: Point, _: MouseEvent | null): Promise<Datatip | null> {
    const m = this.core.reportBusy("Getting data tip...");
    return new Promise((resolve) => {
      const offset = editor.getBuffer().characterIndexForPosition(bufferPos);
      const filePath = editor.getPath();
      this.core.spawn(
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
        this.core.logTrace(err);
        m.dispose();
        resolve(null);
       });
    });
  }
}
