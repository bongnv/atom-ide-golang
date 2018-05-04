import { CompositeDisposable, TextEditor } from "atom";
import { IndieDelegate} from "atom/linter";
import {
  AutocompleteProvider,
  BusySignalService,
  ConsoleService,
  DatatipService,
  DefinitionProvider,
  FileCodeFormatProvider,
  FindReferencesProvider,
  OutlineProvider,
} from "types/atom-ide";
import { Core } from "./core";
import { GoCode } from "./gocode";
import { GoGetDoc } from "./gogetdoc";
import { GoImports } from "./goimports";
import { GoLint } from "./golint";
import { GoOutline } from "./gooutline";
import { Guru } from "./guru";

class GoLanguageClient {
  public config: any;
  private core: Core;
  private gammarScopes: string[];
  private name: string;
  private priority: number;
  private subscriptions: CompositeDisposable;

  private goCode: GoCode;
  private goGetDoc: GoGetDoc;
  private goImports: GoImports;
  private goOutline: GoOutline;
  private guru: Guru;
  private golint: GoLint;

  constructor() {
    this.config = require("./config-schema.json");
    this.core = new Core();
    this.gammarScopes = ["source.go"];
    this.name = "Go";
    this.priority = 1;
    this.subscriptions = new CompositeDisposable();
    this.goGetDoc = new GoGetDoc(this.core);
    this.goCode = new GoCode(this.core);
    this.goImports = new GoImports(this.core);
    this.goOutline = new GoOutline(this.core);
    this.guru = new Guru(this.core);
    this.golint = new GoLint(this.core);
  }

  public activate() {
    if (this.subscriptions) {
      this.subscriptions.dispose();
    }
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(this.core);
    this.subscriptions.add(atom.commands.add(
      "atom-text-editor[data-grammar~=\"go\"]",
      "golang:golint", () => {
        this.golint.lintCheck(atom.workspace.getActiveTextEditor());
      },
    ));

    this.subscriptions.add(atom.workspace.observeTextEditors((editor) => {
      if (!editor || !editor.getBuffer() || !this.isEditorSupported(editor)) {
        return;
      }

      const bufferSubscriptions = new CompositeDisposable();
      bufferSubscriptions.add(editor.getBuffer().onDidSave(() => {
        this.golint.lintCheck(editor);
      }));
      bufferSubscriptions.add(editor.getBuffer().onDidDestroy(() => {
        bufferSubscriptions.dispose();
      }));
      this.subscriptions.add(bufferSubscriptions);
    }));
  }

  public deactivate() {
    this.subscriptions.dispose();
  }

  public provideDefinitions(): DefinitionProvider {
    return {
      getDefinition: this.guru.getDefinition.bind(this.guru),
      grammarScopes: this.gammarScopes,
      name: this.name,
      priority: this.priority,
    };
  }

  public consumeLinterV2(register: (opts: {name: string}) => IndieDelegate) {
    const linter = register({
      name: this.name,
    });
    this.core.linter = linter;
    this.subscriptions.add(linter);
  }

  public consumeDatatip(service: DatatipService): void {
    const datatip = service.addProvider({
      datatip: this.goGetDoc.getDatatip.bind(this.goGetDoc),
      grammarScopes: this.gammarScopes,
      priority: this.priority,
      providerName: this.core.myPackage,
      validForScope: (scopeName: string) => this.gammarScopes.includes(scopeName),
    });
    this.subscriptions.add(datatip);
  }

  public consumeBusySignal(busyService: BusySignalService) {
    this.core.busyService = busyService;
  }

  public consumeConsole(createConsole: ConsoleService) {
    const console = createConsole({id: "golang", name: this.name});
    this.core.console = console;
    this.subscriptions.add(console);
  }

  public provideAutocomplete(): AutocompleteProvider {
    return {
      excludeLowerPriority: false,
      getSuggestions: this.goCode.getSuggestions.bind(this.goCode),
      inclusionPriority: this.priority,
      selector: this.gammarScopes.map((g) => "." + g).join(", "),
      suggestionPriority: this.priority + 1,
    };
  }

  public provideFileCodeFormat(): FileCodeFormatProvider {
      return {
        formatEntireFile: this.goImports.formatFile.bind(this.goImports),
        grammarScopes: this.gammarScopes,
        priority: this.priority,
      };
  }

  public provideOutlines(): OutlineProvider {
    return {
      getOutline: this.goOutline.getOutline.bind(this.goOutline),
      grammarScopes: this.gammarScopes,
      name: this.name,
      priority: this.priority,
    };
  }

  public provideReferences(): FindReferencesProvider {
    return {
      findReferences: this.guru.getReferences.bind(this.guru),
      isEditorSupported: this.isEditorSupported.bind(this),
    };
  }

  private isEditorSupported(editor: TextEditor): boolean {
    return this.gammarScopes.includes(editor.getGrammar().scopeName);
  }
}

module.exports = new GoLanguageClient();
