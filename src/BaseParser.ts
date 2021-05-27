// BaseParser.ts
import Node, { NodeType } from './Node';
import Tree, { Token } from './Tree';
import Validator from './Validator';

// basically a state machine that parses incoming tokens into JotDown
// parseBlock sets the block-level mode
// parseInline parses everything else into inline-level nodes

// primary block level node types
const Mode = [
  'comment',
  'stylesheet',
  'plaintext',
  'newline',
  'hr',
  'text',
  'heading',
  'fences',
  'blockquote',
  'spoiler',
  'list',
  'table',
  'comment',
  'citation_definition',
  'footnote_definition',
] as const;

// tertiary modes to capture additional data for the following block nodes terminated by newlines
const TertMode = [
  'fences', // language
  'blockquote', // cite
  'spoiler', // summary
] as const;

// submodes that cannot contain textModes and is used to get additional data
const SubMode = [
  'comment', // only a submode to differentiate between block and inline level comments
  'heading_id',
  'mid_abbr',
  'mid_link',
  'citation',
  'footnote',
  'citation_definition',
  'footnote_definition',
] as const;

// modes that uses newlines to exit out of
const newlineCloserModes: Array<Partial<typeof NodeType[number]>> = ['heading', 'footnote_definition', 'citation_definition'];

class BaseParser {
  validator: Validator;

  Tree: Tree;
  overridesMode: boolean;
  blockGroupMode: boolean;
  private doubleNewline: boolean; // check if on second newline to exit out of text mode

  currentMode: typeof Mode[number]; // primary block level node types
  tertMode?: typeof TertMode[number]; // tertiary modes to capture additional data for the following block nodes terminated by newlines
  currentSubMode?: typeof SubMode[number]; // submodes that cannot contain textModes and is used to get additional data
  requiresNewline: boolean; // force user to enter a newline to exit current block level mode
  ignoreParsingUntilTokenType?: string; // parse all input as plaintext until the specified node type is encountered

  constructor(validator: Validator) {
    this.validator = validator;

    this.overridesMode = false;
    this.blockGroupMode = false;
    this.doubleNewline = false;

    this.Tree = new Tree();
    this.currentMode = 'newline';
    this.requiresNewline = false;
  }

  reset = () => {
    this.overridesMode = false;
    this.blockGroupMode = false;
    this.doubleNewline = false;
    this.ignoreParsingUntilTokenType = undefined;

    this.Tree.reset();
    this.currentMode = 'newline';
    this.tertMode = undefined;
    this.currentSubMode = undefined;
    this.requiresNewline = false;
  };

  // check if depthStack has unclosed tokens.
  // validNode argument is provided to pass check if the last item on the stack is the valid node.
  validateDepthStack = (validNode?: typeof NodeType[number]) => {
    if (validNode && this.Tree.depthStack.length) {
      const currentNodeType = this.Tree.depthStack[this.Tree.depthStack.length - 1].type;
      if (currentNodeType !== validNode && currentNodeType !== '') {
        throw new Error(`Unclosed token '${currentNodeType}' near ${Tree.getText(this.safeAccessCurrentNode())}`);
      }
    }
    if (!validNode && this.Tree.depthStack.length) {
      const currentNodeType = this.Tree.depthStack[this.Tree.depthStack.length - 1].type;
      throw new Error(`Unclosed token '${currentNodeType}' near ${Tree.getText(this.safeAccessCurrentNode())}`);
    }
  };

  safeAccessCurrentNode = (blockLevel?: boolean): Node => {
    if (this.blockGroupMode && blockLevel) {
      // access last node past the block group
      return this.Tree.accessCurrentNode(true, 'div')!;
    }
    return this.Tree.accessCurrentNode(blockLevel);
  };

  parseInline(newToken: Token) {
    const token = newToken;
    let { currentNode } = this.Tree;

    // SPECIAL CASE FOR ignoreParsingUntilTokenType FLAG
    if (this.ignoreParsingUntilTokenType && this.ignoreParsingUntilTokenType !== token.type) {
      this.Tree.pushAsBlank(token);
      return;
    }

    // SPECIAL CASES FOR OVERRIDES AND INLINE GROUPS
    // PARSE OVERRIDES
    if (token.type === 'left_curly') {
      this.Tree.push({ ...token, type: 'overrides' });
      this.overridesMode = true;
      return;
    }

    // ENTER INLINE GROUP MODE
    if (token.type === 'inline_group_start') {
      token.type = 'span';
      this.Tree.push(token);
      return;
    }

    // EXIT INLINE GROUP MODE
    if (token.type === 'inline_group_end') {
      this.validateDepthStack('span');
      token.type = 'span';
      this.Tree.push(token);
      return;
    }

    // EXIT BLOCK GROUP MODE
    if (token.type === 'block_group_end') {
      this.Tree.push({ type: this.currentMode, start: token.start, end: token.start, value: '' });
      this.validateDepthStack('div');
      token.type = 'div';
      this.Tree.push(token);
      this.blockGroupMode = false;
      this.currentMode = 'newline';
      this.requiresNewline = true;
      return;
    }

    // THROW ERROR IF requiresNewline IS TRUE BUT CURRENT TOKEN IS NOT NEWLINE
    if (this.requiresNewline && token.type !== 'newline') {
      throw new Error(`Newline required for node "${this.Tree.accessCurrentNode().type}" near "${Tree.getText(this.Tree.accessCurrentNode())}"`);
    }

    // SPECIAL CASE FOR NEWLINES
    if (token.type === 'newline') {
      // SPECIAL CASE FOR TO EXIT A TEXT NODE WITH 2 NEWLINES
      if (this.currentMode === 'text') {
        if (currentNode.type === 'code') {
          return;
        }

        this.validateDepthStack(this.currentMode);
        if (this.doubleNewline) {
          this.Tree.push({
            type: this.currentMode as typeof NodeType[number],
            start: token.start,
            end: token.end,
            value: '',
          });
          this.currentMode = 'newline';
        } else {
          this.doubleNewline = true;
          this.Tree.push({ ...token, newValue: '', doNotAddToDepthStack: true, skipOverrides: true });
        }
        return;
      }

      // EXIT OUT OF MODES THAT CLOSES WITH A NEWLINE
      if (newlineCloserModes.includes(this.currentMode)) {
        this.validateDepthStack(this.currentMode);
        this.Tree.push({
          ...token,
          type: this.currentMode as typeof NodeType[number],
          value: '',
          start: token.start,
          end: token.end,
        });
        this.currentMode = 'newline';
        return;
      }

      // RESET requiresNewline
      if (this.requiresNewline) {
        this.currentMode = 'newline';
        this.requiresNewline = false;
        return;
      }

      // ACCOUNT FOR tertMode
      if (this.currentMode !== 'newline' && this.tertMode) {
        switch (this.tertMode) {
          case 'fences':
            this.Tree.popIfBlank(token);
            currentNode = this.Tree.currentNode;
            currentNode.data.language = Tree.getText(currentNode);
            this.ignoreParsingUntilTokenType = 'fences';
            break;
          case 'blockquote':
            this.Tree.popIfBlank(token);
            currentNode = this.Tree.currentNode;
            currentNode.data.cite = Tree.getText(currentNode);
            break;
          case 'spoiler':
            // end current text node
            this.Tree.popIfBlank(token);
            // refresh reference
            currentNode = this.Tree.currentNode;
            this.validateDepthStack(this.currentMode);
            currentNode.data.summary.children = currentNode.children;
            currentNode.data.onSummary = false;
            break;
          default:
            break;
        }
        currentNode.children = [];
        this.tertMode = undefined;
        return;
      }

      // ACCOUNT FOR blockquote AND spoiler WITHOUT tertMode SET
      if (this.currentMode === 'blockquote' || this.currentMode === 'spoiler') {
        this.Tree.push({ ...token, newValue: '', doNotAddToDepthStack: true, skipOverrides: true });
        return;
      }
    }

    // RESET doubleNewline
    this.doubleNewline = false;

    // SPECIAL CASES TO GET EXTRA DATA FOR SUBMODES
    if (this.currentSubMode) {
      switch (this.currentSubMode) {
        case 'heading_id':
          if (token.type !== 'heading_id') {
            this.safeAccessCurrentNode(true).data.id += token.value;
            return;
          }
          break;
        case 'mid_abbr':
          if (token.type !== 'right_para') {
            currentNode.data.fullText += token.value;
            return;
          }
          break;
        case 'mid_link':
          if (token.type !== 'right_para') {
            currentNode.data.link += token.value;
            return;
          }
          break;
        case 'citation':
        case 'citation_definition':
          if (token.type !== 'right_para') {
            currentNode.data.key += newToken.value;
            return;
          }
          break;
        case 'footnote':
        case 'footnote_definition':
          if (token.type !== 'right_brac') {
            currentNode.data.key += newToken.value;
            return;
          }
          break;
        default:
          break;
      }
    }

    // PARSE TOKEN INTO INLINE NODE
    switch (token.type) {
      // EXIT STYLESHEET
      case 'stylesheet':
        if (this.currentMode === token.type) {
          this.Tree.push({ ...token, skipOverrides: true });
          this.ignoreParsingUntilTokenType = undefined;
          this.requiresNewline = true;
        }
        break;
      // EXIT PLAINTEXT
      case 'block_plaintext':
        if (this.currentMode === 'plaintext') {
          this.Tree.push({ ...token, type: 'plaintext', skipOverrides: true });
          this.ignoreParsingUntilTokenType = undefined;
          this.requiresNewline = true;
        }
        break;
      // EXIT FENCES
      case 'fences':
        if (this.currentMode === token.type) {
          this.validateDepthStack(token.type);
          this.Tree.push(token);
          this.ignoreParsingUntilTokenType = undefined;
          this.requiresNewline = true;
        }
        break;
      // EXIT BLOCKQUOTE / SPOILER
      case 'blockquote':
      case 'spoiler':
        if (this.currentMode === token.type) {
          this.validateDepthStack(token.type);
          this.Tree.push(token);
          this.requiresNewline = true;
        }
        break;
      // INLINE COMMENT
      case 'start_comment':
        this.currentSubMode = 'comment';
        this.ignoreParsingUntilTokenType = 'end_comment';
        token.type = 'comment';
        this.Tree.push({ ...token, skipOverrides: true });
        break;
      // EXIT COMMENT
      case 'end_comment':
        if (this.currentMode === 'comment') {
          this.ignoreParsingUntilTokenType = undefined;
          this.requiresNewline = true;
          token.type = 'comment';
          this.Tree.push(token);
        } else if (this.currentSubMode === 'comment') {
          this.ignoreParsingUntilTokenType = undefined;
          this.currentSubMode = undefined;
          token.type = 'comment';
          this.Tree.push(token);
        } else {
          this.Tree.pushAsBlank(token);
        }
        break;
      // INLINE STYLE TAG
      case 'strong':
      case 'u':
      case 'mark':
      case 'em':
      case 's':
      case 'sup':
      case 'sub':
        if (!this.currentSubMode) {
          this.Tree.push(token);
        } else {
          this.Tree.pushAsBlank(token);
        }
        break;
      // INLINE CODE
      case 'code':
        if (!this.currentSubMode) {
          if (!this.ignoreParsingUntilTokenType) {
            this.ignoreParsingUntilTokenType = 'code';
          } else {
            // change whitespace to singular spaces for inline code when ending
            currentNode.value = currentNode.value?.replace(/\s+/g, ' ');
            this.ignoreParsingUntilTokenType = undefined;
          }
          this.Tree.push(token);
        } else {
          this.Tree.pushAsBlank(token);
        }
        break;
      // INLINE PLAINTEXT
      case 'inline_plaintext':
        if (!this.currentSubMode) {
          if (!this.ignoreParsingUntilTokenType) {
            this.ignoreParsingUntilTokenType = 'inline_plaintext';
          } else {
            this.ignoreParsingUntilTokenType = undefined;
          }
          token.type = 'plaintext';
          this.Tree.push({ ...token, skipOverrides: true });
        } else {
          this.Tree.pushAsBlank(token);
        }
        break;
      // ABBREVIATION
      case 'abbr':
        if (!this.currentSubMode) {
          this.Tree.push({ ...token, data: { fullText: '' } });
        } else {
          this.Tree.pushAsBlank(token);
        }
        break;
      case 'mid_abbr':
        // check if the current inline node is an abbr
        this.Tree.popIfBlank(token);
        currentNode = this.Tree.currentNode;
        if (!this.currentSubMode && currentNode.type === 'abbr') {
          this.currentSubMode = 'mid_abbr';
        } else {
          this.Tree.pushAsBlank(token);
        }
        break;
      // CITATION / FOOTNOTE
      case 'citation':
      case 'footnote':
        if (!this.currentSubMode) {
          this.currentSubMode = token.type;
          this.Tree.push({ ...token, data: { key: '' } });
        } else {
          this.Tree.pushAsBlank(token);
        }
        break;
      // LINK / IMAGE
      case 'left_brac':
      case 'email':
        if (!this.currentSubMode) {
          if (token.type === 'left_brac') {
            token.type = 'link';
          }
          this.Tree.push({ ...token, data: { link: '' } });
        } else {
          this.Tree.pushAsBlank(newToken);
        }
        break;
      // IMAGE
      case 'image':
        if (!this.currentSubMode) {
          this.Tree.push({ ...token, data: { link: '' } });
          this.ignoreParsingUntilTokenType = 'mid_link';
        } else {
          this.Tree.pushAsBlank(newToken);
        }
        break;
      case 'mid_link':
        // check if the current inline node is a link, image or email
        this.Tree.popIfBlank(token);
        currentNode = this.Tree.currentNode;
        if (!this.currentSubMode && ['link', 'image', 'email'].includes(currentNode.type)) {
          if (currentNode.type === 'image') {
            this.ignoreParsingUntilTokenType = undefined;
          }
          this.currentSubMode = 'mid_link';
        } else {
          this.Tree.pushAsBlank(newToken);
        }
        break;
      // HEADING ID
      case 'heading_id':
        if (this.currentMode === 'heading' && !this.currentSubMode) {
          // make sure to access the header node, and not div in block mode
          this.safeAccessCurrentNode(true).data.id = '';
          this.currentSubMode = 'heading_id';
        } else if (this.currentMode === 'heading' && this.currentSubMode === 'heading_id') {
          this.validator.validateID(currentNode.data.id);
          this.currentSubMode = undefined;
        } else {
          this.Tree.pushAsBlank(newToken);
        }
        break;
      case 'right_para':
        if (this.currentSubMode === 'citation') {
          const index = this.validator.valdiateCitationKey(currentNode.data.key);
          currentNode.data.index = index;
          this.Tree.push({ ...token, type: 'citation' });
          this.currentSubMode = undefined;
        } else if (this.currentMode === 'citation_definition' && this.currentSubMode === 'citation_definition') {
          currentNode.data.refs = this.validator.validateCitationDefinition(currentNode.data?.key);
          this.currentSubMode = undefined;
        } else if (this.currentSubMode === 'mid_abbr' || this.currentSubMode === 'mid_link') {
          if (currentNode.type === 'link' || currentNode.type === 'image') {
            const splitForTitle = currentNode.data.link.split(' ');
            if (splitForTitle.length === 2) {
              [currentNode.data.link, currentNode.data.title] = splitForTitle;
            }
          }
          this.Tree.push({ ...token, type: currentNode.type });
          this.currentSubMode = undefined;
        } else {
          this.Tree.pushAsBlank(token);
        }
        break;
      case 'right_brac':
        if (this.currentSubMode === 'footnote') {
          const index = this.validator.validateFootnoteKey(currentNode.data.key);
          currentNode.data.index = index;
          this.Tree.push({ ...token, type: 'footnote' });
          this.currentSubMode = undefined;
        } else if (this.currentMode === 'footnote_definition' && this.currentSubMode === 'footnote_definition') {
          currentNode.data.refs = this.validator.validateFootnoteDefinition(currentNode.data?.key);
          this.currentSubMode = undefined;
        } else {
          this.Tree.pushAsBlank(newToken);
        }
        break;
      default:
        this.Tree.pushAsBlank(newToken);
        break;
    }
  }

  // SET CURRENT BLOCK-LEVEL MODE
  parseBlock(newToken: Token) {
    const token = newToken;
    // SPECIAL CASES FOR OVERRIDES AND BLOCK GROUPS
    // PARSE OVERRIDES
    if (token.type === 'left_curly') {
      this.Tree.push({ ...token, type: 'overrides' });
      this.overridesMode = true;
      return;
    }

    // ENTER BLOCK GROUP MODE
    if (token.type === 'block_group_start') {
      token.type = 'div';
      this.Tree.push(token);
      this.blockGroupMode = true;
      return;
    }

    // EXIT BLOCK GROUP MODE
    if (token.type === 'block_group_end') {
      this.validateDepthStack('div');
      token.type = 'div';
      this.Tree.push(token);
      this.blockGroupMode = false;
      this.currentMode = 'newline';
      this.requiresNewline = true;
      return;
    }

    // THROW ERROR IF requiresNewline IS TRUE BUT CURRENT TOKEN IS NOT NEWLINE
    if (this.requiresNewline && token.type !== 'newline') {
      throw new Error(`Newline required for node "${this.Tree.accessCurrentNode().type}" near "${Tree.getText(this.Tree.accessCurrentNode())}"`);
    }

    // PARSE TOKEN INTO BLOCK NODE
    this.currentMode = token.type as typeof Mode[number];

    switch (token.type) {
      // NEWLINE
      case 'newline':
        this.requiresNewline = false;
        // CHANGE MODE TO NEWLINE
        if (this.currentMode !== 'newline') {
          this.currentMode = 'newline';
        }
        this.Tree.push({ ...token, newValue: '', doNotAddToDepthStack: true, skipOverrides: true });
        break;
      // STYLESHEET
      case 'stylesheet':
        this.ignoreParsingUntilTokenType = token.type;
        this.Tree.push({ ...token, skipOverrides: true });
        break;
      // PLAINTEXT
      case 'block_plaintext':
        this.currentMode = 'plaintext';
        this.ignoreParsingUntilTokenType = 'block_plaintext';
        this.Tree.push({ ...token, type: 'plaintext', skipOverrides: true });
        break;
      // COMMENT
      case 'start_comment':
        this.currentMode = 'comment';
        this.ignoreParsingUntilTokenType = 'end_comment';
        token.type = 'comment';
        this.Tree.push(token);
        break;
      // HR
      case 'hr':
        this.Tree.push({ ...token, doNotAddToDepthStack: true });
        this.requiresNewline = true;
        break;
      // HEADING
      case 'heading': {
        const match = token.value.match(/#([1-6])/);
        this.Tree.push({ ...token, data: { level: match ? match[1] : 6 } });
        break;
      }
      // FENCES
      case 'fences':
        this.tertMode = 'fences';
        this.Tree.push({ ...token, data: { language: '' } });
        break;
      // BLOCKQUOTE
      case 'blockquote':
        this.tertMode = 'blockquote';
        this.Tree.push({ ...token, data: { cite: '' } });
        break;
      // SPOILER
      case 'spoiler':
        this.tertMode = 'spoiler';
        this.Tree.push({ ...token, data: { summary: { type: 'text', children: [], data: { childText: true } } as Node, onSummary: true } });
        break;
      // TABLE
      case 'table_row_start':
        this.currentMode = 'table';
        // make a table parent container block node, and add first row
        this.Tree.push({ ...token, type: 'table' }, { ...token, type: 'table_row' });
        return;
      // LIST
      case 'ul':
      case 'ol':
        this.currentMode = 'list';
        // make a list parent container block node, and add first row
        this.Tree.push({ ...token, type: token.type }, { ...token, type: 'list_item' });
        return;
      // CITATION DEFINITION
      case 'citation':
        this.currentMode = 'citation_definition';
        this.currentSubMode = 'citation_definition';
        this.Tree.push({ ...token, type: 'citation_definition', data: { key: '' } });
        return;
      // FOOTNOTE DEFINITION
      case 'footnote':
        this.currentMode = 'footnote_definition';
        this.currentSubMode = 'footnote_definition';
        this.Tree.push({ ...token, type: 'footnote_definition', data: { key: '' } });
        return;
      default:
        // PARSE EVERYTHING ELSE AS AN INLINE TOKEN
        this.currentMode = 'text';

        // MAKE A VALUE-LESS PARENT TEXT NODE, THEN ADD INITIAL TEXT AS A CHILD
        this.Tree.push({ ...token, type: 'text' });
        this.parseInline(token);
        break;
    }
  }
}

export default BaseParser;
