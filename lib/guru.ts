import { Point, TextEditor } from "atom";
import { DefinitionQueryResult, FindReferencesReturn } from "types/atom-ide";
import { GoTool } from "./gotool";
import * as utils from "./utils";

export class Guru extends GoTool {
  public getDefinition(editor: TextEditor, point: Point): Promise<DefinitionQueryResult | null> {
    return new Promise((resolve, _) => {
      const offset = editor.getBuffer().characterIndexForPosition(point);
      this.spawn(
        "guru",
        ["-json", "-modified", "definition", editor.getPath() + ":#" + offset],
        {
          cwd: utils.getDirname(editor),
          input: utils.getFileArchive(editor),
        },
      ).then((out: string) => {
        const output = JSON.parse(out.toString());
        resolve(utils.jsonToDefinitionQueryResult(output));
      }).catch((err: any) => {
        this.logTrace(err);
        resolve(null);
      });
    });
  }

  public getReferences(editor: TextEditor, point: Point): Promise<FindReferencesReturn | null> {
    return new Promise((resolve, _) => {
      const offset = editor.getBuffer().characterIndexForPosition(point);
      this.spawn(
        "guru",
        ["-modified", "referrers", editor.getPath() + ":#" + offset],
        {
          cwd: utils.getDirname(editor),
          input: utils.getFileArchive(editor),
        },
      ).then((out: string) => {
        resolve(utils.guruReferrersToAtomReferences(editor, out));
      }).catch((err: any) => {
        this.logWarn(err);
      });
    });
  }
}
