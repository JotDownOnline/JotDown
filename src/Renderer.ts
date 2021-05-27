// Renderer.ts
import Node from './Node';
import Tree from './Tree';
import indexToCharSeq from './indexToCharSeq';

// default styles injected into rendered output.

class Renderer {
  standalone: boolean;
  defaultStyles: string;

  constructor(standalone: boolean = false, defaultStyles: string = '') {
    this.standalone = standalone;
    this.defaultStyles = defaultStyles;
  }

  trim = (node: Node) => {
    if (node.children.length && node.children[node.children.length - 1].type === 'newline') {
      node.children.pop();
    }
    if (node.children.length && node.children[0].type === 'newline') {
      node.children.shift();
    }
  };

  renderText = (node: Node): string => {
    if (node.type === '' && node.value) {
      return node.value;
    }
    return '';
  };

  returnOverrides = (node: Node) => {
    const overrides = [];
    if (node.data?.id || node.overrides?.id) {
      overrides.push(`id=${node.data?.id || node.overrides?.id}`);
    }
    if (node.overrides?.classes) {
      overrides.push(`class='${node.overrides.classes}'`);
    }
    if (node.overrides?.style) {
      const inlineStyles: string = Object.entries(node.overrides.style).map((inlineStyle) => `${inlineStyle[0]}:${inlineStyle[1]}`).join(';');
      overrides.push(`style="${inlineStyles}"`);
    }
    return `${overrides.length ? ' ' : ''}${overrides.join(' ')}`;
  };

  renderNode = (node: Node): string => {
    let childrenOutput = '';

    // trim whitespace
    this.trim(node);

    node.children.forEach((child: Node) => {
      if (child.children.length) {
        childrenOutput += this.renderBlock(child);
      } else {
        childrenOutput += this.renderNode(child);
      }
    });

    const formattedOverrides = this.returnOverrides(node);
    let useAlpha: boolean;
    let allRefs = [];

    switch (node.type) {
      case 'overrides':
        return '';
      case 'stylesheet':
        return `<style >${childrenOutput}</style>`;
      case 'plaintext':
        return childrenOutput;
      case 'blockquote':
        return `<blockquote${formattedOverrides} cite="${node.data.cite}">${childrenOutput}</blockquote>`;
      case 'div':
      case 'span':
      case 'strong':
      case 'u':
      case 'mark':
      case 'em':
      case 's':
      case 'sup':
      case 'sub':
        return `<${node.type}${formattedOverrides}>${childrenOutput}</${node.type}>`;
      case 'newline':
        return '\n<br/>\n';
      case 'hr':
        return `\n<hr ${formattedOverrides}/>\n`;
      case 'heading':
        return `<h${node.data.level}${formattedOverrides}>${childrenOutput}</h${node.data.level}>\n`;
      case 'fences':
        return `<pre><code${formattedOverrides}>${childrenOutput}</code></pre>\n`;
      case 'code':
        return `<span><code${formattedOverrides}>${childrenOutput}</code></span>`;
      case 'spoiler':
        return `<details${formattedOverrides}><summary>${this.renderNode(node.data.summary)}</summary>${childrenOutput}</details>\n`;
      case 'abbr':
        return `<abbr title="${node.data.fullText}">${childrenOutput}</abbr>`;
      case 'link':
        return `<a href="${node.data.link}" title="${Tree.getText(node)}">${childrenOutput}</a>`;
      case 'image':
        return `<img src="${node.data.link}" alt="${Tree.getText(node)}" title="${node.data.title || ''}"/>`;
      case 'email':
        return `<a href="mailto: ${node.data.link}" title="${Tree.getText(node)}">${childrenOutput}</a>`;
      case 'citation':
        return `(<a style='text-decoration: none' id='ctref:${encodeURIComponent(node.data.key)}:${node.data.index}' href='#ct:${encodeURIComponent(node.data.key)}'>${node.data.key}</a>)`;
      case 'citation_definition':
        allRefs = [...Array(node.data.refs)].reduce((refs, ref, currentIndex) => {
          const index = indexToCharSeq(currentIndex);
          let refsCopy = refs;
          refsCopy += `<sup><b><i><a style='text-decoration: none' href='#ctref:${encodeURIComponent(node.data.key)}:${index}'>${index}</a></i></b></sup> `;
          return refsCopy;
        }, '');
        return `<div id='ct:${encodeURIComponent(node.data.key)}'>${node.data.key}${childrenOutput} ${allRefs}</div>`;
      case 'footnote':
        return `<sup>[<a style='text-decoration: none' id='fnref:${node.data.key}:${node.data.index}' href='#fn:${node.data.key}'>${node.data.key}</a>]</sup>`;
      case 'footnote_definition':
        useAlpha = Boolean(Number.isInteger(node.data.key));
        allRefs = [...Array(node.data.refs)].reduce((refs, ref, currentIndex) => {
          const index = useAlpha ? indexToCharSeq(currentIndex) : currentIndex;
          let refsCopy = refs;
          refsCopy += `<sup><b><i><a style='text-decoration: none' href='#fnref:${node.data.key}:${index}'>${index}</a></i></b></sup> `;
          return refsCopy;
        }, '');
        return `<div id='fn:${node.data.key}'>${node.data.key}${childrenOutput} ${allRefs}</div>`;
      case 'ul':
      case 'ol':
        return this.renderList(node);
      case 'text':
        if (node.data?.childText) {
          return childrenOutput;
        }
        return `<p${formattedOverrides}>\n${childrenOutput}\n</p>\n`;
      case 'table_cell':
      case 'list_item':
        return childrenOutput;
      default:
        return this.renderText(node);
    }
  };

  renderTable = (block: Node): string => {
    let output = '';
    const rows = [...block.children];
    const formattedOverrides = this.returnOverrides(block);
    output += `<table${formattedOverrides}>`;
    if (block.data?.hasHeader) {
      output += '<thead><tr>';
      // table -> row -> header -> cells
      rows[0].children[0].children.forEach((cell: Node) => {
        output += `<th>${this.renderNode(cell)}</th>`;
      });
      rows.shift();
      output += '</tr></thead>';
    }
    output += '<tbody>';
    rows.forEach((row: Node) => {
      output += '<tr>';
      row.children.forEach((cell) => {
        output += `<td>${this.renderNode(cell)}</td>`;
      });
      output += '</tr>';
    });
    output += '</tbody></table>';
    return output;
  };

  renderList = (block: Node): string => {
    let output = '';
    const formattedOverrides = this.returnOverrides(block);
    if (block.type === 'ul' || block.type === 'ol') {
      output += `\n<${block.type}${formattedOverrides}>\n`;
      const items = block.children;
      items.forEach((item) => {
        const itemContent = this.renderNode(item);
        if (item.data?.isTaskItem) {
          output += `${item.data?.isSubList ? '' : '<li>'}<input type='checkbox' ${item.data.checked ? 'checked readOnly' : 'disabled'}>${itemContent}</input>${item.data && item.data.isSubList ? '' : '</li>'}\n`;
        } else {
          output += `${item.data?.isSubList ? '' : '<li>'}${itemContent}${item.data && item.data.isSubList ? '' : '</li>'}\n`;
        }
      });
      output += `</${block.type}>\n`;
    } else {
      return `<li>${this.renderNode(block)}</li>\n`;
    }
    return output;
  };

  renderBlock = (block: Node): string => {
    // transforms into <p> if block is only text
    let renderFunc = this.renderNode;
    if (block.type === 'table') {
      renderFunc = this.renderTable;
    } else if (block.type === 'ul' || block.type === 'ol') {
      renderFunc = this.renderList;
    }
    return renderFunc(block);
  };

  render = (tree: Tree): string => {
    let output = '';
    if (this.standalone) {
      output += '<html>\n<body>\n';
    }
    output += this.defaultStyles ? `<style>${this.defaultStyles}</style>\n` : '';
    tree.nodes.forEach((block: Node) => {
      output += `${this.renderBlock(block)}\n`;
    });
    if (this.standalone) {
      output += '\n<body>\n<html>';
    }
    return output;
  };
}

export default Renderer;
