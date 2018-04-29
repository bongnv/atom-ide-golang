import { TextEditor } from "atom";
import { Outline } from "types/atom-ide";
import { GoOutlineResponse } from "types/golang";
import { GoTool } from "./gotool";
import * as utils from "./utils";

export class GoOutline extends GoTool {
  public getOutline(editor: TextEditor): Promise<Outline | null> {
    return new Promise((resolve, _) => {
      this.spawn(
        "go-outline",
        ["-f=" + editor.getPath(), "-modified"],
        {
          cwd: utils.getDirname(editor),
          input: utils.getFileArchive(editor),
        },
      ).then((out: string) => {
        const results = JSON.parse(out) as GoOutlineResponse[];
        resolve({
          outlineTrees: results.map((outline) => utils.goOutlineToAtomOutline(editor, outline)),
        });
      }).catch((err: any) => {
        this.core.logWarn(err);
        resolve(null);
      });
    });
  }
}
