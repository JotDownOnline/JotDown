// rules.ts
import { Rule } from './Scanner';

const rules: Array<Rule> = [
  // groups
  { name: 'block_group_start', literal: '{{', lookBehind: { literal: '\n' } }, // block_group_start has a newline in the token to diffrentiate between block and inline level
  { name: 'inline_group_start', literal: '{{' },
  { name: 'block_group_end', literal: '}}', lookBehind: { literal: '\n' } },
  { name: 'inline_group_end', literal: '}}' },
  // newline
  { name: 'newline', literal: '\n' },
  { name: 'newline', literal: '\r' },
  // block
  { name: 'hr', literal: '---', lookBehind: { literal: '\n' } },
  { name: 'heading', literal: '#6 ', lookBehind: { literal: '\n' } },
  { name: 'heading', literal: '#5 ', lookBehind: { literal: '\n' } },
  { name: 'heading', literal: '#4 ', lookBehind: { literal: '\n' } },
  { name: 'heading', literal: '#3 ', lookBehind: { literal: '\n' } },
  { name: 'heading', literal: '#2 ', lookBehind: { literal: '\n' } },
  { name: 'heading', literal: '#1 ', lookBehind: { literal: '\n' } },
  { name: 'heading_id', literal: '#', lookBehind: { ruleName: 'heading' } },
  { name: 'heading_id', literal: '# ' },
  { name: 'fences', literal: '```', lookBehind: { literal: '\n' } },
  { name: 'blockquote', literal: '"""', lookBehind: { literal: '\n' } },
  { name: 'spoiler', literal: '+++', lookBehind: { literal: '\n' } },
  // stylesheet
  { name: 'stylesheet', literal: '$$$', lookBehind: { literal: '\n' } },
  // plaintext
  { name: 'block_plaintext', literal: '===', lookBehind: { literal: '\n' } },
  // comment
  { name: 'start_comment', literal: '/*' },
  { name: 'end_comment', literal: '*/' },
  // inline
  { name: 'strong', literal: '!!' },
  { name: 'u', literal: '__' },
  { name: 'mark', literal: '||' },
  { name: 'em', literal: '//' },
  { name: 's', literal: '~~' },
  { name: 'sup', literal: '^' },
  { name: 'sub', literal: '_' },
  { name: 'code', literal: '`' },
  { name: 'inline_plaintext', literal: '=' },
  { name: 'abbr', literal: '>>' },
  { name: 'mid_abbr', literal: '<<(' },
  { name: 'citation', literal: '(^' },
  { name: 'footnote', literal: '[^' },
  { name: 'image', literal: '![' },
  { name: 'email', literal: '@[' },
  { name: 'mid_link', literal: '](' },
  // util
  { name: 'left_brac', literal: '[' },
  // overrides
  { name: 'left_curly', literal: '{' },
  { name: 'right_curly', literal: '}' },
  // closers
  { name: 'right_para', literal: ')' },
  { name: 'right_brac', literal: ']' },
  // additional features
  { name: 'toc', literal: ':toc:', lookBehind: { ruleName: 'newline' } },
  { name: 'table_row_start', literal: '|', lookBehind: { literal: '\n' } },
  { name: 'table_row_terminator', literal: '|\n' },
  { name: 'pipe', literal: '|' },
  { name: 'space', literal: ' ', lookBehind: { literal: '\n' } },
  { name: 'space', literal: ' ', lookBehind: { literal: ' ' } },
  { name: 'ul', literal: '. ', lookBehind: { literal: '\n' } },
  { name: 'ul', literal: '. ', lookBehind: { literal: ' ' } },
  { name: 'ol', literal: ') ', lookBehind: { literal: '\n' } },
  { name: 'ol', literal: ') ', lookBehind: { literal: ' ' } },
  { name: 'task_item', literal: '[]', lookBehind: { ruleName: 'ul' } },
  { name: 'task_item', literal: '[]', lookBehind: { ruleName: 'ol' } },
  { name: 'checked_task_item', literal: '[x]', lookBehind: { ruleName: 'ul' } },
  { name: 'checked_task_item', literal: '[x]', lookBehind: { ruleName: 'ol' } },
];

export default rules;
