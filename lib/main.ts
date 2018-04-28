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
import { GoCode } from "./gocode";
import { GoGetDoc } from "./gogetdoc";
import { GoImports } from "./goimports";
import { GoOutline } from "./gooutline";
import { Guru } from "./guru";

class GoLanguageClient {
  private gammarScopes: string[];
  private name: string;
  private priority: number;
  private subscriptions: CompositeDisposable;

  private goCode: GoCode;
  private goGetDoc: GoGetDoc;
  private goImports: GoImports;
  private goOutline: GoOutline;
  private guru: Guru;

  constructor() {
    this.name = "Go";
    this.gammarScopes = ["source.go"];
    this.priority = 1;
    this.subscriptions = new CompositeDisposable();
    this.goGetDoc = new GoGetDoc();
    this.goCode = new GoCode();
    this.goImports = new GoImports();
    this.goOutline = new GoOutline();
    this.guru = new Guru();
  }

  public activate() {
    if (this.subscriptions) {
      this.subscriptions.dispose();
    }
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(this.goGetDoc);
    this.subscriptions.add(this.goCode);
    this.subscriptions.add(this.goImports);
    this.subscriptions.add(this.guru);
    this.subscriptions.add(this.goOutline);
  }

  public deactivate() {
    this.subscriptions.dispose();
  }

  public provideDefinitions(): DefinitionProvider {
    return {
      getDefinition: this.guru.getDefinition.bind(this.guru),
      grammarScopes: this.gammarScopes,
      name: this.name,
      priority: 20,
    };
  }

  public consumeLinterV2(register: (opts: {name: string}) => IndieDelegate) {
    const linter = register({
      name: this.name,
    });
    this.goImports.setLinter(linter);
    this.goGetDoc.setLinter(linter);
    this.subscriptions.add(linter);
  }

  public consumeDatatip(service: DatatipService): void {
    const datatip = service.addProvider({
      datatip: this.goGetDoc.getDatatip.bind(this.goGetDoc),
      grammarScopes: this.gammarScopes,
      priority: this.priority,
      providerName: "ide-golang",
      validForScope: (scopeName: string) => this.gammarScopes.includes(scopeName),
    });
    this.subscriptions.add(datatip);
  }

  public consumeBusySignal(busyService: BusySignalService) {
    this.goGetDoc.setBusyService(busyService);
  }

  public consumeConsole(createConsole: ConsoleService) {
    const console = createConsole({id: "golang", name: this.name});
    this.goGetDoc.setConsole(console);
    this.guru.setConsole(console);
    this.goCode.setConsole(console);
    this.goImports.setConsole(console);
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
      isEditorSupported: (editor: TextEditor) => this.gammarScopes.includes(editor.getGrammar().scopeName),
    };
  }
}

module.exports = new GoLanguageClient();
