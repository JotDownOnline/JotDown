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

## Links

JotDown is open sourced: you can view the JotDown spec [here](http://jotdown.online/spec), and the docs [here](http://jotdown.online/docs).

JotDown will also be continually updated according the [roadmap](http://jotdown.online/roadmap), with the goal of eventually open-sourcing the editor as well.

[Please don't hesitate to send feedback or complaints](mailto:admin@jotdown.online)
