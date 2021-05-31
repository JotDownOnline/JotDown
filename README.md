# JotDown
JotDown is a Markdown variant designed for note-taking, but also contains a multitude of features.

[You can play with JotDown here!](http://jotdown.online/editor)

* **_Real_ live-preview**: JotDown is parsed like a programming language into an AST. This means that an Editor can start **bolding** and *emphasizing* text before you complete the tags.
* **Symbols that <u>makes more sense</u>**: Symbols like `**` for bolding are derived from typeset and email standards. JotDown revised and added more symbols to make the source more understandable. Some examples include:
  * **!!strong!!** instead of **\*\*strong\*\***
  * *//emphasis//* instead of **\*emphasis\***
  * #6 instead of ######
* **Native support for more HTML5 elements**: Markdown was designed in 2004 and continually updated to meet newer HTML standards, but some features are still not "natively" supported by Markdown and require an HTML escape hatch. However, these are all included in JotDown natively:
  * Tables, lists and task lists
  * Table of Contents
  * <u>underlining</u>, <s>strikethrough</s>, <mark>marking</mark>, <sup>super</sup> and <sub>sub</sub> scripts, <abbr title="Abbreviations">abbr</abbr> and spoilers
  * Citations and footnotes
  * **Overrides**: JotDown allows for (almost) all elements to be overridden to include inline styles, ID and classes. There is also a built-in way to manage a document stylesheet.
* **Custom container**: JotDown allows for content to be wrapped in a `span` or `div` tag using custom containers, makes overriding much easier
* **Comments**: JotDown source files can include comments that will not be rendered, allowing for the source document to contain annotations for the author.

## _Real_ live-preview?

Most Markdown implementation (including the original) utilizes RegEx to match tags that enclose content. In order for most parsers to recognize bolded text, the user would need to fully type **\*\*bolded text\*\***. In JotDown, because there is an expanded "vocabulary" of unique (but also, in my opinion, more coherent) symbols, the user only needs to type in **!!** and the text following it will all be bolded until the parser encounters another **!!**. But what does this all mean?

Load up your favorite Markdown editor, or *any* Markdown editor, and type in "\*\*text". Chances are, either it will autofill in "\*\*" at the end of the text once you hit "t", or it'll just show "\*\*text". [Using the JotDown editor](http://jotdown.online/editor), typing in "!!text" start bolding immediately after you type "**!!**" and will show "**!!text**".

This was a primary driver for the development of JotDown: having the Editor give proper feedback to the user to allow for the best experience in both writing and editing.

## Block Nodes

There are a total of 13 block level nodes used in JotDown. A node is considered block level if it __both follows and is followed__ by a !!newline!!.

| Node Type | Markdown | JotDown | Details |
|-----------|----------|---------|---------|
| Stylesheet | N/A | $$$ | Converts to HTML `<style>` tag |
| Plaintext | N/A | \=\=\= | The browser will be responsible for rendering the content. Used to write HTML or plaintext without JotDown parsing the contents |
| Table of Contents | N/A | :toc: | Auto-magically inserts a Table of Contents based on the document's headers |
| Div | N/A | \{\{ and \}\} | The enclosed content is treated as a single node. Used for grouping together other block nodes so they can share overrides |
| Comment | \/\* and \*\/ | N/A | A block level comment is used to annotate the raw source, the enclosed content is not rendered at all |
| hr | ***/\-\-\-/\_\_\_ | \-\-\- | Horizontal rule used to separate content|
| Heading | \# to \#\#\#\#\#\# | #1 to #6 | Heading to denote the start of a new section, a space is required after the heading level |
| Text | N/A | N/A | A node that contains text |
| Fences | \`\`\` | \`\`\` | A node that contains code |
| Blockquote | > | \"\"\" | A node that contains a quote. In Markdown, each line of the quote requires a `>`; In JotDown, the entire quote can simply just go between the tags |
| Spoiler | N/A | \+\+\+ | Renders to HTML `details` and `summary` tag. The contents within the tags will be hidden until the reader clicks on the summary|
| Citation Definition | N/A | \(\^\) | Defines a citation |
| Footnote Definition | N/A | \[\^\] | Defines a footnote |

## Inline Nodes

There are a total of 17 inline level nodes used in JotDown. A node is considered inline level if it can be contained in any __block level__ node that allows for such.

|Node Type | Markdown | JotDown | Details|
|----------|----------|--------|--------|
| Span | N/A | \{\{ and \}\} | The enclosed content is treated as a single node. Used for grouping together multiple inline nodes so they can share overrides |
| Comment | N/A | \/\* and \*\/ | The enclosed content is not rendered at all|
| Plaintext | N/A | \=\=\= | The browser will be responsible for rendering the content. Used to write HTML or plaintext without JotDown parsing the contents |
| Abbreviation | N/A | \>\>ShortText\<\<\(Full Text\) | Renders to HTML `abbr` tag |
| Superscript | N/A | \^ | Renders to HTML `sup` tag |
| Subscript | N/A | \_ | Renders to HTML `sub` tag |
| Strong | **/\_\_ | \!\! | Renders to HTML `strong` tag |
| Underline | N/A | \_\_ | Renders to HTML `u` tag |
| Mark | N/A | \|\| | Renders to HTML `mark` tag |
| Emphasis | */\_ | \/\/ | Renders to HTML `em` tag |
| Strikethrough | \~\~ | \~\~ | Renders to HTML `s` tag |
| Code | N/A | \` | Renders to HTML `code` tag |
| Link | \[text\]\(URL title\) | \[text\]\(URL title\) | Renders to HTML `a` tag |
| Image | \!\[alt-text\]\(URL title\) | \!\[alt-text\]\(URL\) | Renders to HTML `img` tag |
| Email | \!\[text\]\(email\) | \!\[text\]\(email\) | Renders to HTML `a` tag with `mailto` attribute |
| Citation | N/A | \(\^\) | Used to cite a source or attribute credit in a parenthetical manner |
| Footnote | N/A | \[\^\] | Used to cite a source or attribute credit in a superscripted note |

## Tables and Lists

The syntax for tables and lists differ a little bit from Markdown as well. Below are examples for both:

```
// TABLE
// table with heading row
|[Table|Heading]|
|Table|Contents|

// table without heading row
|Table|Heading|
|Table|Contents|
```

```
// LIST
// unordered lists uses prefix '. ' (period followed by a space)
// ordered lists uses prefix ') ' (right parenthesis followed by a space)

. Unordered List 1 Item 1
 ) Ordered List 1 Item 1
 ) Ordered List 1 Item 2
. [x] Unordered List 1 Item 2 with task item

// indentations determine list levels
// the first list item determines the type of list it is
. Unordered List Item 1
) Unordered List Item 2
```

## Links

JotDown is open sourced: you can view the JotDown spec [here](http://jotdown.online/spec), and the docs [here](http://jotdown.online/docs).

JotDown will also be continually updated according the [roadmap](http://jotdown.online/roadmap), with the goal of eventually open-sourcing the editor as well.

[Please don't hesitate to send feedback or complaints](mailto:admin@jotdown.online)
