import * as path from "path";
import { AutocompleteRequest, AutocompleteSuggestion } from "types/atom-ide";
import { GoCodeSuggestion } from "types/golang";
import { Core } from "./core";

export class GoCode {
  private core: Core;

  constructor(core: Core) {
    this.core = core;
  }

  public getSuggestions(request: AutocompleteRequest): Promise<AutocompleteSuggestion[] | null> {
    return new Promise((resolve, _) => {
      const {bufferPosition, editor} = request;

      const buffer = editor.getBuffer();
      const index = buffer.characterIndexForPosition(bufferPosition);
      const filePath = editor.getPath();
      if (!filePath) {
       resolve(null);
      }
      this.core.spawn(
       "gocode",
       ["-f=json", "autocomplete", String(filePath), String(index)],
       {
         cwd: filePath && path.dirname(filePath),
         input: editor.getText(),
       },
      ).then((output: string) => {
       const results = JSON.parse(output) as [number, GoCodeSuggestion[]];
       if (results.length < 2) {
         resolve(null);
         return;
       }
       resolve(results[1].map((src) => ({
         className: src.type,
         text: src.name,
         type: src.class,
       })));
      }).catch((err: any) => {
       this.core.logTrace(err);
       resolve(null);
      });
    });
  }
}
