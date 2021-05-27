// OverridesParser.ts
import { Overrides } from './Node';
import { Token } from './Tree';
import BaseParser from './BaseParser';
import Validator from './Validator';

// use a string to contain all overrides between {}
// use regex to extract style, id and class from the string

// use regex instead of char by char parsing since the
// whole override need to be provided before it is parsed

class OverridesParser {
  baseParser: BaseParser;
  validator: Validator;

  debug: boolean;

  overridesString: string; // string to regex overrides from
  currentOverrides: Overrides; // object to hold regex'd overrides

  constructor(baseParser: BaseParser, validator: Validator, debug: boolean = false) {
    this.baseParser = baseParser;
    this.validator = validator;

    this.debug = debug;
    this.overridesString = '';
    this.currentOverrides = { raw: '' };
  }

  reset = () => {
    this.overridesString = '';
    this.currentOverrides = { raw: '' };
  };

  parseOverrides = (newToken: Token) => {
    // end overrides parsing condition
    if (newToken.type === 'right_curly') {
      // INLINE STYLES
      this.baseParser.safeAccessCurrentNode().value = this.overridesString;
      this.currentOverrides = { raw: this.overridesString };
      const inlineStyles = this.overridesString.match(/\$(.*)\$/);
      if (inlineStyles) {
        this.currentOverrides.style = inlineStyles[1].split(';').reduce((styles, style) => {
          const stylesCopy = styles;
          if (style) {
            const splitStyles = style.split(':');
            stylesCopy[splitStyles[0].trim()] = splitStyles[1].trim();
          }
          return stylesCopy;
        }, {} as {[name: string]: string });
        // delete from the string just to be safe
        this.overridesString = this.overridesString.replace(inlineStyles[0], '');
      }
      // ID
      const id = this.overridesString.match(/#([A-Za-z0-9][A-Za-z0-9-_:.]*)(?=\W|)/);
      if (id) {
        const trimmedID = id[1].trim();
        this.validator.validateID(trimmedID);
        this.currentOverrides.id = trimmedID;
        // delete from the string just to be safe
        this.overridesString = this.overridesString.replace(id[0], '');
      }
      // CLASS (CAN HAVE MULTIPLE)
      const classNames = this.overridesString.match(/\.(.*)/);
      if (classNames) {
        this.currentOverrides.classes = classNames[1].trim();
      }
      if (this.debug) {
        console.log('styles: ', this.currentOverrides.style, 'id: ', this.currentOverrides.id, 'classnames: ', this.currentOverrides.classes);
      }
      this.baseParser.Tree.setOverride(this.currentOverrides);
      this.baseParser.Tree.push({ ...newToken, type: 'overrides', skipOverrides: true });
      this.reset();
      this.baseParser.overridesMode = false;
    } else {
      this.overridesString += newToken.value;
    }
  };
}

export default OverridesParser;
