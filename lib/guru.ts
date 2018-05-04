import { Point, TextEditor } from "atom";
import { DefinitionQueryResult, FindReferencesReturn } from "types/atom-ide";
import { Core } from "./core";
import * as utils from "./utils";

export class Guru {
  private core: Core;
  constructor(core: Core) {
    this.core = core;
  }

  public getDefinition(editor: TextEditor, point: Point): Promise<DefinitionQueryResult | null> {
    const m = this.core.reportBusy("Go to definitions...");
    return new Promise((resolve, _) => {
      const offset = editor.getBuffer().characterIndexForPosition(point);
      this.core.spawn(
        "guru",
        ["-json", "-modified", "definition", editor.getPath() + ":#" + offset],
        {
          cwd: utils.getDirname(editor),
          input: utils.getFileArchive(editor),
        },
      ).then((out: string) => {
        const output = JSON.parse(out.toString());
        m.dispose();
        resolve(utils.jsonToDefinitionQueryResult(output));
      }).catch((err: any) => {
        this.core.logTrace(err);
        m.dispose();
        resolve(null);
      });
    });
  }

  public getReferences(editor: TextEditor, point: Point): Promise<FindReferencesReturn | null> {
    return new Promise((resolve, _) => {
      const offset = editor.getBuffer().characterIndexForPosition(point);
      this.core.spawn(
        "guru",
        ["-modified", "referrers", editor.getPath() + ":#" + offset],
        {
          cwd: utils.getDirname(editor),
          input: utils.getFileArchive(editor),
        },
      ).then((out: string) => {
        resolve(utils.guruReferrersToAtomReferences(editor, out));
      }).catch((err: any) => {
        this.core.logWarn(err);
        resolve(err);
      });
    });
  }
}
