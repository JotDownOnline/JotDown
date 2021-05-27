// Parser.ts
import Tree from './Tree';
import Scanner, { Token } from './Scanner';

import Validator from './Validator';

import BaseParser from './BaseParser';

import SpecialParser from './SpecialParser';
import OverridesParser from './OverridesParser';

// routes tokens to Base, Special or Override Parsers

// BaseParser is contains all the methods for parsing both block and inline
// level nodes. SpecialParser depends on it to insert the proper nodes.

// SpecialParser extends BaseParser by using its parsing methods, but contains its own logic
// for parsing tables and lists

// OverridesParser parses overrides and gives it to BaseParser's Tree
// which then applies it to the next available node to be added to the tree

interface Options {
  debug?: boolean;
  debugScanner?: boolean;
  debugParser?: boolean;
  debugSpecialParser?: boolean;
  debugOverridesParser?: boolean;
}

class Parser {
  private options?: Options;
  Tree: Tree;

  private Scanner: Scanner;
  private validator: Validator;
  private BaseParser: BaseParser;
  private SpecialParser: SpecialParser;
  private OverridesParser: OverridesParser;
  private tokenStream: Array<Token>; // input stream of all tokens
  parsedTokens: Array<Token>; // output stream of all parsed tokens

  get hasEmptyDepthStack(): boolean {
    return !this.Tree.depthStack.length || (this.Tree.depthStack.length === 1 && this.BaseParser.blockGroupMode);
  }

  constructor(scanner: Scanner, initialSource: string = '', options?: Options) {
    this.options = options;
    this.validator = new Validator();
    this.Scanner = scanner;
    this.BaseParser = new BaseParser(this.validator);
    this.Tree = this.BaseParser.Tree;
    this.SpecialParser = new SpecialParser(this.BaseParser, options?.debug || options?.debugSpecialParser);
    this.OverridesParser = new OverridesParser(this.BaseParser, this.validator, options?.debug || options?.debugOverridesParser);
    this.tokenStream = [];
    this.parsedTokens = [];
    this.parse(initialSource);
  }

  reset = () => {
    this.validator.reset();
    this.BaseParser.reset();
    this.SpecialParser.reset();
    this.OverridesParser.reset();
    this.tokenStream = [];
    this.parsedTokens = [];
  };

  parseNext = () => {
    const newToken = this.tokenStream.shift();

    if (this.options?.debug || this.options?.debugScanner) {
      console.log('scanner', newToken);
    }
    // nothing to parse
    if (!newToken || newToken.value === '') {
      return;
    }

    // set up TOC in Special Parser
    if (newToken.type === 'toc') {
      this.SpecialParser.setupTOC(newToken);
      return;
    }
    // intercept to parse TOC
    if (this.BaseParser.currentMode === 'heading' && newToken.type === 'newline') {
      this.SpecialParser.parseTOC();
    }

    if (this.BaseParser.overridesMode) {
      this.OverridesParser.parseOverrides(newToken);
    } else if (this.BaseParser.currentMode === 'newline') {
      this.BaseParser.parseBlock(newToken);
    } else if (this.BaseParser.currentMode === 'table') {
      this.SpecialParser.parseTable(newToken);
    } else if (this.BaseParser.currentMode === 'list') {
      this.SpecialParser.parseList(newToken);
    } else {
      this.BaseParser.parseInline(newToken);
    }

    // push newToken to output stream
    this.parsedTokens.push(newToken);
    // DEBUG
    if (this.options?.debug || this.options?.debugParser) {
      console.log('debug', newToken, 'mode:', this.BaseParser.currentMode, 'submode:', this.BaseParser.currentSubMode, 'ignoreParsingUntilTokenType:', this.BaseParser.ignoreParsingUntilTokenType);
      console.log('depthStack', ...this.BaseParser.Tree.depthStack);
    }
  };

  parse = (input: string): boolean => {
    this.tokenStream = this.Scanner.scan(input);
    const scannedValidToken = this.tokenStream.length !== 0;
    while (this.tokenStream.length) {
      this.parseNext();
    }
    return scannedValidToken;
  };
}

export default Parser;
