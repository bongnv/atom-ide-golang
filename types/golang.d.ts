// Types for golang related struct

export interface GoCodeSuggestion {
  class: string;
  name: string;
  type: string;
}

export interface GoGetDocResponse {
  name: string;
  import: string;
  pkg: string;
  decl: string;
  doc: string;
  pos: string;
}

export interface GoOutlineResponse {
  label: string;
  receiverType?: string;
  type: string;
  start: number;
  end: number;
  children: GoOutlineResponse[];
}

export interface SpawnOptions {
  cwd?: string;
  input?: string;
}
