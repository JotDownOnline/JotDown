// JotDown.ts
import rules from './rules';
import Tree, { DepthStack } from './Tree';
import Scanner, { Rule, Token } from './Scanner';
import Node, { NodeType } from './Node';
import Parser from './Parser';
import Renderer from './Renderer';

export type { Node, NodeType, Tree };

export const JotDownStyles = `h1::before, h2::before, h3::before, h4::before, h5::before, h6::before { 
  display: block; 
  content: ""; 
  margin-top: -3.5em; 
  height: 3.5em; 
  visibility: hidden; 
  pointer-events: none;
}

h1, h2, h3, h4, h5, h6 {
  line-height: 1em;
}

p:first-of-type {
  margin-block-start: 0em;
}

table {
  width:100%;
  border-collapse: collapse;
  table-layout: fixed;
}

th, td {
  border: 1px solid black;
}

img {
  max-width: 100%;
}

details {
  cursor: pointer;
}
`;

interface Options {
  debug?: boolean;
  debugScanner?: boolean;
  debugParser?: boolean;
  debugSpecialParser?: boolean;
  debugOverridesParser?: boolean;
  printTree?: boolean
  printRenderedOutput?: boolean;
  standalone?: boolean;
  defaultStyles?: string;
}

class JotDown {
  private Parser: Parser;
  private Scanner: Scanner;
  private Tree: Tree;
  private Renderer: Renderer;

  private options?: Options;

  get nodes(): Array<Node> {
    return this.Tree.nodes;
  }

  get depthStack(): DepthStack {
    return this.Tree.depthStack;
  }

  get matchBuffer(): string {
    return this.Scanner.matchBuffer;
  }

  get matchedRules(): Array<Rule> {
    return this.Scanner.matchedRules;
  }

  get parsedTokens(): Array<Token> {
    return this.Parser.parsedTokens;
  }

  get charactersScanned(): number {
    return this.Scanner.charactersScanned;
  }

  get emittedTokens(): Array<Token> {
    return this.Scanner.emittedTokens;
  }

  get rawStream(): string {
    return this.Scanner.rawStream;
  }

  get hasEmptyDepthStack(): boolean {
    return this.Parser.hasEmptyDepthStack;
  }

  constructor(initialSource: string, options?: Options) {
    this.Scanner = new Scanner(rules);
    this.Parser = new Parser(this.Scanner, initialSource, options);
    this.Tree = this.Parser.Tree;
    this.Renderer = new Renderer(options?.standalone, options?.defaultStyles || JotDownStyles);
    if (options?.printTree) {
      console.log(this.Tree.nodes);
    }
    this.options = options;
  }

  render = (tree?: Tree): string => {
    const output = this.Renderer.render(tree || this.Tree);
    if (this.options?.printRenderedOutput) {
      console.log(output);
    }
    return output;
  };

  rescan = (symbols: string): boolean => {
    this.Scanner.reset();
    this.Parser.reset();
    return this.Parser.parse(symbols);
  };

  read = (symbols: string): boolean => {
    return this.Parser.parse(symbols);
  };
}

export default JotDown;
