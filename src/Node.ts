// Node.ts
export const NodeType = [
  '',
  'overrides',
  'stylesheet',
  'plaintext',
  'toc',
  'div',
  'span',
  'newline',
  'comment',
  'hr',
  'text',
  'heading',
  'fences',
  'blockquote',
  'spoiler',
  'ul',
  'ol',
  'list',
  'list_item',
  'table',
  'table_header',
  'table_row',
  'table_cell',
  'abbr',
  'sup',
  'sub',
  'citation',
  'citation_definition',
  'footnote',
  'footnote_definition',
  'link',
  'email',
  'image',
  'email',
  'strong',
  'u',
  'mark',
  'em',
  's',
  'code',
] as const;

export interface Overrides {
  style?: {[name: string]: string };
  classes?: string;
  id?: string;
  raw: string;
}

interface Node {
  type: typeof NodeType[number];
  key?: string;
  value?: string;
  data?: any;
  overrides?: Overrides;
  children: Array<Node>;
  start?: number;
  end?: number;
}

export default Node;
