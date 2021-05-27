// SpecialParser.ts
import BaseParser from './BaseParser';
import Tree, { Token, DepthStack } from './Tree';

// extension of Parser to parse Table of Contents, tables, lists and footnotes

export enum TOCOp {
  supLevel,
  sameLevel,
  subLevel,
}

export enum TableOp {
  newRow,
  startHeader,
  endHeader,
  closeCell,
  closeRow,
  closeTable,
}

export enum ListOp {
  newList,
  addItem,
  addTaskItem,
  endList,
  ignoreInput,
}

class SpecialParser {
  baseParser: BaseParser;

  private debug: boolean;
  private prevOp: TOCOp | TableOp | ListOp | null;

  // toc
  private tocDepthReference?: DepthStack;
  private tocTree: Tree;
  private tocLevels: Array<number>;
  private start: number;
  private end: number;

  // table
  private setHeader: boolean;
  private curRow: number;

  // list
  private curIndentations: number; // the current list level
  private indentationLevels: Array<number>; // hold the spaces tokens that determine list item level

  constructor(baseParser: BaseParser, debug: boolean = false) {
    this.baseParser = baseParser;
    this.debug = debug;

    this.prevOp = null;
    this.tocTree = new Tree();
    this.start = 0;
    this.end = 0;
    this.tocLevels = [];

    this.setHeader = false;
    this.curRow = 0;

    this.curIndentations = 0;
    this.indentationLevels = [0];
  }

  reset = () => {
    this.prevOp = null;
    this.tocDepthReference = undefined;

    this.tocTree.reset();
    this.start = 0;
    this.end = 0;
    this.tocLevels = [];

    this.setHeader = false;
    this.curRow = 0;

    this.curIndentations = 0;
    this.indentationLevels = [0];
  };

  setupTOC = (token: Token) => {
    this.baseParser.requiresNewline = true;
    this.baseParser.Tree.push({ ...token, skipOverrides: true });
    this.start = token.start;
    this.end = token.end;
    this.tocDepthReference = [...this.baseParser.Tree.depthStack];
    this.baseParser.Tree.push(token);
  };

  parseTOC = () => {
    if (this.tocDepthReference) {
      let curOp: TOCOp;
      const headerNode = this.baseParser.safeAccessCurrentNode(true);
      const level = parseInt(headerNode.data?.level, 10);
      const currentTOCLevel = this.tocLevels[this.tocLevels.length - 1] || 0;

      if (headerNode.data.id === undefined && headerNode.overrides?.id === undefined) {
        headerNode.data.id = Tree.getText(headerNode);
      }

      if (level > currentTOCLevel) {
        this.tocTree.push(
          { type: 'ul', start: 0, end: 0, value: '' },
          { type: 'list_item', start: 0, end: 0, value: '' },
          { type: 'link', start: 0, end: 0, value: '', data: { link: `#${headerNode.data.id || Tree.getText(headerNode)}` } },
          { type: '', start: 0, end: 0, value: '', newValue: Tree.getText(headerNode) },
          { type: 'link', start: 0, end: 0, value: '' },
        );
        this.tocLevels.push(level);
        curOp = TOCOp.subLevel;
      } else if (level === currentTOCLevel) {
        this.tocTree.push(
          { type: 'list_item', start: 0, end: 0, value: '' },
          { type: 'list_item', start: 0, end: 0, value: '' },
          { type: 'link', start: 0, end: 0, value: '', data: { link: `#${headerNode.data.id || Tree.getText(headerNode)}` } },
          { type: '', start: 0, end: 0, value: '', newValue: Tree.getText(headerNode) },
          { type: 'link', start: 0, end: 0, value: '' },
        );
        curOp = TOCOp.sameLevel;
      } else {
        let levelsToPop = this.tocLevels.length - 1 - this.tocLevels.findIndex((tocLevel) => {
          return tocLevel >= level;
        });

        while (levelsToPop) {
          let currentNode = this.tocTree.accessCurrentNode();
          if (currentNode.type === 'list_item') {
            this.tocTree.push({ type: 'list_item', start: 0, end: 0, value: '' });
          }

          if (currentNode.type === 'ul') {
            this.tocTree.push({ type: 'ul', start: 0, end: 0, value: '' });
            this.tocLevels.pop();
            currentNode = this.tocTree.accessCurrentNode();
            levelsToPop -= 1;
          }
        }

        this.tocTree.push(
          { type: 'list_item', start: 0, end: 0, value: '' },
          { type: 'list_item', start: 0, end: 0, value: '' },
          { type: 'link', start: 0, end: 0, value: '', data: { link: `#${headerNode.data.id || Tree.getText(headerNode)}` } },
          { type: '', start: 0, end: 0, value: '', newValue: Tree.getText(headerNode) },
          { type: 'link', start: 0, end: 0, value: '' },
        );
        curOp = TOCOp.supLevel;
      }
      this.tocTree.nodes[0].start = this.start;
      this.tocTree.nodes[0].end = this.end;
      this.baseParser.Tree.replace(this.tocTree.nodes[0], this.tocDepthReference[0].depth);
      this.prevOp = curOp;
      if (this.debug) {
        console.log('TOC level:', level, curOp !== null ? TOCOp[curOp] : null);
      }
    }
  };

  parseTable = (token: Token) => {
    let curOp: TableOp | null = null;

    switch (token.type) {
      // START HEADER
      case 'left_brac':
        if (this.curRow === 0) {
          this.setHeader = true;
          this.baseParser.safeAccessCurrentNode(true).data = { hasHeader: true };
          this.baseParser.Tree.push({ ...token, type: 'table_header' });
          curOp = TableOp.startHeader;
        }
        break;
      // END HEADER
      case 'right_brac':
        if (this.curRow === 0 && this.setHeader) {
          this.baseParser.validateDepthStack('table_cell');
          this.baseParser.Tree.push({ ...token, type: 'table_cell' }, { ...token, type: 'table_header' });
          curOp = TableOp.endHeader;
        }
        break;
      // NEW ROW
      case 'table_row_start':
        this.baseParser.validateDepthStack('table');
        this.baseParser.Tree.push({ ...token, type: 'table_row' });
        curOp = TableOp.newRow;
        break;
      // CLOSE CELL
      case 'pipe':
        this.baseParser.validateDepthStack('table_cell');
        this.baseParser.Tree.push({ ...token, type: 'table_cell' });
        curOp = TableOp.closeCell;
        break;
      // CLOSE ROW
      case 'table_row_terminator':
        this.curRow += 1;
        if (this.baseParser.safeAccessCurrentNode().type !== 'table_row') {
          this.baseParser.validateDepthStack('table_cell');
          this.baseParser.Tree.push({ ...token, type: 'table_cell' });
        }
        this.baseParser.validateDepthStack('table_row');
        this.baseParser.Tree.push({ ...token, type: 'table_row' });
        curOp = TableOp.closeRow;
        break;
      default:
        break;
    }

    // CLOSE TABLE
    if (this.prevOp === TableOp.closeRow && curOp !== TableOp.newRow) {
      this.baseParser.validateDepthStack('table');
      this.baseParser.Tree.push({ type: 'table', start: token.start, end: token.start, value: '' });
      this.resetTable();
      curOp = TableOp.closeTable;
      this.baseParser.parseBlock(token);
    }

    // PARSE CELL CONTENTS
    if (curOp === null) {
      if (this.baseParser.safeAccessCurrentNode().type === 'table_row' || this.baseParser.safeAccessCurrentNode().type === 'table_header') {
        this.baseParser.Tree.push({ ...token, type: 'table_cell' });
      }
      this.baseParser.parseInline(token);
    }

    this.prevOp = curOp;

    if (this.debug) {
      console.log('table', token, curOp !== null ? TableOp[curOp] : null);
    }
  };

  resetTable = () => {
    this.prevOp = null;
    this.setHeader = false;
    this.curRow = 0;
  };

  popListLevelsFromDepthStack = (token: Token) => {
    let levelsToPop = this.indentationLevels.length - 1 - this.indentationLevels.findIndex((indentationLevel) => {
      return indentationLevel >= this.curIndentations;
    });

    while (levelsToPop) {
      let currentNode = this.baseParser.safeAccessCurrentNode();
      if (currentNode.type === 'ol' || currentNode.type === 'ul') {
        this.baseParser.Tree.push({ ...token, type: currentNode.type, start: token.start, end: token.start });
        this.indentationLevels.pop();
        currentNode = this.baseParser.safeAccessCurrentNode();
        levelsToPop -= 1;
      }
      if (currentNode.type === 'list_item') {
        this.baseParser.Tree.push({ ...token, type: 'list_item', start: token.start, end: token.start });
      }
    }
  };

  parseList = (token: Token) => {
    let curOp: ListOp | null = null;

    // ADD TASK ITEM
    if (token.type === 'task_item' || token.type === 'checked_task_item') {
      const currentNode = this.baseParser.safeAccessCurrentNode();
      currentNode.data = {
        ...currentNode.data,
        isTaskItem: true,
        checked: token.type === 'checked_task_item',
      };
      curOp = ListOp.addTaskItem;

    // ADD LIST LEVELS FOR SUBLISTS
    } else if ((this.prevOp ?? ListOp.ignoreInput) && token.type === 'space') {
      this.curIndentations += 1;
      curOp = ListOp.ignoreInput;

    // END LIST
    } else if (this.prevOp === ListOp.ignoreInput && (token.type !== 'ul' && token.type !== 'ol')) {
      // pop all remaining list_items and lists from depthStack
      this.baseParser.Tree.popIfBlank(token);
      let currentDepthStackItem = this.baseParser.Tree.depthStack[this.baseParser.Tree.depthStack.length - 1];
      while (currentDepthStackItem && ['ul', 'ol', 'list_item'].includes(currentDepthStackItem.type)) {
        if (currentDepthStackItem && currentDepthStackItem.type === 'list_item') {
          this.baseParser.Tree.push({ type: 'list_item', start: token.start, end: token.start, value: '' });
          // update reference
          currentDepthStackItem = this.baseParser.Tree.depthStack[this.baseParser.Tree.depthStack.length - 1];
        }
        if (currentDepthStackItem && (currentDepthStackItem.type === 'ul' || currentDepthStackItem.type === 'ol')) {
          this.baseParser.Tree.push({ type: currentDepthStackItem.type, start: token.start, end: token.start, value: '' });
        }

        currentDepthStackItem = this.baseParser.Tree.depthStack[this.baseParser.Tree.depthStack.length - 1];
      }
      this.resetList();
      // parse this token as a new token after the table ends
      this.baseParser.parseBlock(token);
      curOp = ListOp.endList;

    // NEW LIST IF LEVEL IS HIGHER THAN CURRENT LEVEL
    } else if (token.type === 'ul' || token.type === 'ol') {
      if (this.curIndentations > this.indentationLevels[this.indentationLevels.length - 1]) {
        this.indentationLevels.push(this.curIndentations);
        this.baseParser.Tree.push({ ...token, type: token.type, end: token.start }, { ...token, type: 'list_item' });
        curOp = ListOp.newList;
      } else {
        // ADD ITEM IF LIST IS LOWER OR EQUAL LEVEL TO CURRENT LIST
        // end current list item
        this.baseParser.validateDepthStack('list_item');
        this.baseParser.Tree.push({ ...token, type: 'list_item', end: token.start });
        // pop levels
        this.popListLevelsFromDepthStack(token);
        // add new node
        this.baseParser.Tree.push({ ...token, type: 'list_item' });
        curOp = ListOp.addItem;
      }

    // IGNORE NEWLINES
    } else if (token.type === 'newline') {
      this.baseParser.Tree.popIfBlank(token);
      this.baseParser.validateDepthStack('list_item');
      this.curIndentations = 0;
      curOp = ListOp.ignoreInput;

    // PARSE LIST ITEM CONTENTS
    } else if (curOp === null) {
      this.baseParser.parseInline(token);
    }

    this.prevOp = curOp;

    if (this.debug) {
      console.log('list', token, curOp !== null ? ListOp[curOp] : null);
    }
  };

  resetList = () => {
    this.curIndentations = 0;
  };
}

export default SpecialParser;
