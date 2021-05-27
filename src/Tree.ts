// Tree.ts
import { nanoid } from 'nanoid';
import Node, { Overrides, NodeType } from './Node';
import { Token } from './Scanner';

export type { Token } from './Scanner';

export type DepthStack = Array<{type: string, depth: number}>;

class Tree {
  private internalCurrentOverride?: Overrides;
  private internalNodes: Array<Node>;
  internalDepthStack: DepthStack; // stack to track unclosed tokens

  get currentOverride(): Overrides | undefined {
    return this.internalCurrentOverride;
  }

  get nodes(): Array<Node> {
    return this.internalNodes;
  }

  get currentNode(): Node {
    return this.accessCurrentNode();
  }

  get depthStack(): DepthStack {
    return this.internalDepthStack;
  }

  get length(): number {
    return this.internalNodes.length;
  }

  constructor() {
    this.internalNodes = [];
    this.internalDepthStack = [];
  }

  // get values of all '' internalNodes starting from the parentNode
  static getText = (parentNode: Node) => {
    const value: string = parentNode.children.map((child: Node) => {
      if (child.children.length) {
        return Tree.getText(child);
      }
      if (child.type === '') {
        return child.value;
      }
      return '';
    }).join('');

    return value;
  };

  setOverride = (overrides?: Overrides) => {
    this.internalCurrentOverride = overrides;
  };

  // access the most recent node added to the Tree
  // blockLevel accesses the most recent block-level node
  // nodeType specifies a block-level node to search for, then within
  accessCurrentNode = (blockLevel?: boolean, nodeType?: typeof NodeType[number]): Node => {
    // only returns inline-level nodes
    if (this.internalDepthStack.length && !blockLevel) {
      let node: Node = this.internalNodes[this.internalDepthStack[0].depth];
      this.internalDepthStack.slice(1).forEach((unclosedToken) => {
        node = node.children[unclosedToken.depth];
      });
      return node;
    }
    // access the most current block-level node within the most current block-level node of nodeType
    if (nodeType) {
      const safeIndex = this.internalDepthStack.map((depthEntry) => depthEntry.type).lastIndexOf(nodeType);
      if (safeIndex !== -1) {
        const internalDepthStack = this.internalDepthStack.slice(0, safeIndex + 2);
        let blockNode: Node = this.internalNodes[internalDepthStack[0].depth];
        internalDepthStack.slice(1).forEach((unclosedToken) => {
          blockNode = blockNode.children[unclosedToken.depth];
        });
        return blockNode;
      }
    }
    return this.internalNodes[this.internalNodes.length - 1];
  };

  // add new node to current tail node
  private addToTree = (newNode: Node, doNotAddToDepthStack: boolean = false) => {
    const newNodeCopy = newNode;
    let { currentNode } = this;
    // special case for appending and ending blank nodes
    if (currentNode && currentNode.type === '') {
      if (newNodeCopy.type === '') {
        if (currentNode.value === undefined) {
          currentNode.value = '';
        }
        currentNode.value += newNodeCopy.value;
        currentNode.end = newNodeCopy.end;
        // used to manually pop blank nodes
        if (newNode.value === '') {
          this.internalDepthStack.pop();
        }
        return;
      }
      // exit out of blank node if new node is not blank
      currentNode.end = newNodeCopy.start;
      this.internalDepthStack.pop();
    }
    // refresh reference
    currentNode = this.currentNode;
    // has open tokens
    if (this.internalDepthStack.length) {
      // close an open token if the type matches
      if (newNodeCopy.type === this.internalDepthStack[this.internalDepthStack.length - 1].type) {
        currentNode.end = newNodeCopy.end;
        this.internalDepthStack.pop();
        return;
      }
      if (!doNotAddToDepthStack) {
        delete newNodeCopy.end;
      }
      // push inline-level internalNodes
      currentNode.children.push(newNodeCopy);
      // add open token to the depthStack
      if (!doNotAddToDepthStack) {
        this.internalDepthStack.push({ type: newNodeCopy.type, depth: currentNode.children.length - 1 });
      }
    } else {
      if (!doNotAddToDepthStack) {
        delete newNodeCopy.end;
      }
      // push a block-level node
      this.internalNodes.push(newNodeCopy);
      if (!doNotAddToDepthStack) {
        this.internalDepthStack.push({ type: newNodeCopy.type, depth: this.internalNodes.length - 1 });
      }
    }
  };

  push = (...args: Array<Token & { newValue?: string, data?: {}, skipOverrides?: boolean, doNotAddToDepthStack?: boolean }>) => {
    const newNodes = [...args];
    newNodes.forEach((newNode) => {
      // overriding the token type
      const node: Node = {
        type: newNode.type as typeof NodeType[number],
        children: [],
        key: nanoid(10),
        start: newNode.start,
        end: newNode.end,
        ...(newNode.newValue !== undefined && { value: newNode.newValue }),
        ...(newNode.data !== undefined && { data: newNode.data }),
        ...(this.internalCurrentOverride && !newNode.skipOverrides && { overrides: this.internalCurrentOverride }),
      };
      if (this.internalCurrentOverride && !newNode.skipOverrides) {
        this.setOverride();
      }
      this.addToTree(node, newNode.doNotAddToDepthStack);
    });
  };

  pushAsBlank = (newNode: Token & { value?: string}) => {
    // overriding the token type
    const node: Node = {
      type: '',
      children: [],
      key: nanoid(10),
      start: newNode.start,
      end: newNode.end,
      ...(newNode.value !== undefined && { value: newNode.value }),
    };
    this.addToTree(node);
  };

  // since blank tokens are appended instead of popped if the incoming token is also blank
  // this allows for popping the blank token if it's the currentNode;
  popIfBlank = (token: Token) => {
    if (this.currentNode.type === '') {
      this.currentNode.end = token.start;
      this.internalDepthStack.pop();
    }
  };

  // replace a block level node on the Tree
  replace = (replacementNode: Node, depth: number) => {
    if (depth > this.internalNodes.length) {
      throw new Error('Depth exceeded.');
    }
    this.internalNodes[depth] = replacementNode;
  };

  // clear tree
  reset = () => {
    this.internalCurrentOverride = undefined;
    this.internalNodes = [];
    this.internalDepthStack = [];
  };
}

export default Tree;
