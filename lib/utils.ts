import { BufferScanResult, Point, Range, TextBuffer, TextEditor } from "atom";
import { Message} from "atom/linter";
import * as path from "path";
import {
  DefinitionQueryResult,
  FindReferencesReturn,
  OutlineTree,
  Reference,
  TokenizedText,
  TokenKind,
} from "types/atom-ide";
import { GoOutlineResponse } from "types/golang";

export function jsonToDefinitionQueryResult(input: {objpos: string, desc: string}): DefinitionQueryResult | null {
  const positions = input.objpos.split(":");
  const row = parseInt(positions[1], 10);
  const col = parseInt(positions[2], 10);
  return {
    definitions: [
      {
        language: "Go",
        name: input.desc,
        path: positions[0],
        position: new Point(row - 1, col - 1),
      },
    ],
  };
}

export function getDirname(editor: TextEditor): string | undefined {
  const filePath = editor.getPath();
  return filePath && path.dirname(filePath);
}

export function getFileArchive(editor: TextEditor): string {
  const fileContents = editor.getText();
  return editor.getPath() + "\n" +
    Buffer.byteLength(fileContents, "utf8") + "\n" + fileContents;
}

export function parseLintErrors(input: string, pathPrefix?: string): [Message[], string[]] {
  const messages: Message[] = [];
  const others: string[] = [];
  const prefix = pathPrefix || "";
  for (const line of input.split("\n")) {
    if (line.trim().length === 0 ) {
      continue;
    }

    const match = /^(.+):(\d+):(\d+):(.*)?$/img.exec(line);
    if (!match) {
      others.push(line);
      continue;
    }
    const [, file, lineStr, offsetStr, excerpt] = match;
    const row = parseInt(lineStr, 10);
    const offset = parseInt(offsetStr, 10);
    messages.push({
      excerpt,
      location: {
        file: path.resolve(prefix, file),
        position: new Range([row - 1, offset - 1], [row - 1, offset - 1]),
      },
      severity: "error",
    });
  }

  return [messages, others];
}

// go-outline parsing stuffs
const goOutlineTypeToAtomIcon: {[x: string]: string; } = {
  function: "type-function",
  import: "type-module",
  package: "type-package",
  type: "type-class",
  variable: "type-variable",
};

const goOutlineTypeToTokenKind: {[x: string]: TokenKind; } = {
  function: "method",
  import: "string",
  package: "string",
  type: "type",
  variable: "param",
};

export function goOutlineToAtomOutline(editor: TextEditor, outline: GoOutlineResponse): OutlineTree {
  const tokenizedText: TokenizedText = [];
  if (outline.receiverType) {
    tokenizedText.push(
      {
        kind: "param",
        value: "( " + outline.receiverType + ")",
      },
      {
        kind: "whitespace",
        value: " ",
      },
    );
  }
  tokenizedText.push({
    kind: goOutlineTypeToTokenKind[outline.type] || "plain",
    value: outline.label,
  });
  return {
    children: outline.children ? outline.children.map((item) => goOutlineToAtomOutline(editor, item)) : [],
    endPosition: editor.getBuffer().positionForCharacterIndex(outline.end - 1),
    icon: goOutlineTypeToAtomIcon[outline.type],
    representativeName: outline.label,
    startPosition: editor.getBuffer().positionForCharacterIndex(outline.start - 1),
    tokenizedText,
  };
}

export function guruReferrersToAtomReferences(editor: TextEditor, input: string): FindReferencesReturn {
  const filePath = editor.getPath();
  const lines = input.split("\n");
  const results: Reference[] = [];
  let symbolName = "";
  for (const line of lines) {
    const match = /^(.*):(\d+)\.(\d+)-(\d+)\.(\d+):/.exec(line);
    if (!match || match.length < 6) {
      continue;
    }
    const [, file, lineStartStr, colStartStr, lineEndStr, colEndStr] = match;
    if (symbolName.length === 0 && file === filePath) {
      symbolName = editor.getTextInBufferRange(
        new Range([+ lineStartStr - 1, + colStartStr - 1], [+ lineEndStr - 1, + colEndStr]),
      );
    }

    results.push({
      name: path.basename(file),
      range: new Range([+ lineStartStr - 1, + colStartStr - 1], [+ lineEndStr - 1, + colEndStr]),
      uri: file,
    });
  }
  return {
    baseUri: filePath || "",
    referencedSymbolName: symbolName,
    references: results,
    type: "data",
  };
}

export function goPathFromPath(filePath: string | undefined): string | undefined {
  if (!filePath) {
    return undefined;
  }

  while (filePath.length > 4) {
    if (path.basename(filePath) === "src") {
      return path.dirname(filePath);
    }
    filePath = path.dirname(filePath);
  }

  return undefined;
}

// From https://github.com/t9md/atom-vim-mode-plus
// It receives a TextEditor and a Point to return Range of the word at
// current point.
export function getCurrentWordBufferRange(editor: TextEditor, point: Point) {
  const nonWordCharacters = "/\\()\"':,.;<>~!@#$%^&*|+=[]{}`?-…";
  const range = _getRegexpRangeAtPosition(
    editor.getBuffer(),
    point,
    new RegExp(`[^\\s${escapeRegExp(nonWordCharacters)}]+`, "g"),
  );
  return range || new Range(point, point);
}

function escapeRegExp(s: string): string {
  return s ? s.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") : "";
}

function _getRegexpRangeAtPosition(buffer: TextBuffer, position: Point, wordRegex: RegExp): Range | null {
  const {row, column} = position;
  const rowRange = buffer.rangeForRow(row, false);
  let matchData: BufferScanResult | undefined | null;
  // Extract the expression from the row text.
  buffer.scanInRange(wordRegex, rowRange, (data: BufferScanResult) => {
    const {range} = data;
    if (
      position.isGreaterThanOrEqual(range.start) &&
      // Range endpoints are exclusive.
      position.isLessThan(range.end)
    ) {
      matchData = data;
      data.stop();
      return;
    }
    // Stop the scan if the scanner has passed our position.
    if (range.end.column > column) {
      data.stop();
    }
  });
  return matchData == null ? null : matchData.range;
}
