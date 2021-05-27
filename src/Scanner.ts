// Scanner.ts

interface LookBehindBase {
  negative?: boolean;
}
interface LookBehindLiteral extends LookBehindBase {
  literal: string;
  ruleName?: never;
}
interface LookBehindRuleName extends LookBehindBase {
  literal?: never;
  ruleName: string;
}
type LookBehind = LookBehindLiteral | LookBehindRuleName;

export interface Rule {
  name: string;
  literal: string;
  lookBehind?: LookBehind;
}

export interface Token {
  type: string;
  value: string;
  start: number;
  end: number;
}

class Scanner {
  private escapeSeq: string; // escape character that will ignore the proceeding character
  private sofLiteral: string; // start of file that gets automatically tokenized
  private ruleSet: Array<Rule>; // rule set to follow
  private internalMatchedRules: Array<Rule>; // subset of rules that matched
  private internalMatchBuffer: string; // stores the current string that partially matches a rule
  private internalOutputBuffer: string; // stores the current string doesn't match any rules, but awaits the next token before being released
  charactersScanned: number; // current length of the rawStream
  emittedTokens: Array<Token>; // track all tokens that has been outputted
  rawStream: string; // track all input that has been scanned

  get matchBuffer(): string {
    return this.internalMatchBuffer;
  }

  get outputBuffer(): string {
    return this.internalOutputBuffer;
  }

  get matchedRules(): Array<Rule> {
    return this.internalMatchedRules;
  }

  // sofToken is the first token "scanned" to allow for
  // positive or negative lookbehinds for the first token
  constructor(ruleSet: Array<Rule>, sofLiteral = '\n', escapeSeq = '\\') {
    this.escapeSeq = escapeSeq;
    this.sofLiteral = sofLiteral;
    this.ruleSet = ruleSet;
    this.internalMatchedRules = [];
    this.internalMatchBuffer = '';
    this.internalOutputBuffer = '';
    this.emittedTokens = [];
    this.rawStream = '';
    this.validateLookBehinds();
    this.scan(this.sofLiteral || '');
    this.charactersScanned = 0;
  }

  // prepare a token to be emitted by pushing into emittedTokens and incrementing the characters scanned
  private emitToken = (type: string, value: string) => {
    // increment charactersScanned by the length of the token to be emitted
    const end = this.charactersScanned + value.length;
    // filter through output to delete escape char
    let escapedEscapeSeq = false;
    const escapedValue = Array.from(value).filter((char) => {
      if (char === this.escapeSeq) {
        if (escapedEscapeSeq) {
          escapedEscapeSeq = false;
          return true;
        }
        escapedEscapeSeq = true;
        return false;
      }
      escapedEscapeSeq = false;
      return true;
    }).join('');

    const token = { type, value: escapedValue, start: this.charactersScanned, end };
    // assign the end as the new charactersScanned
    this.charactersScanned = end;
    // append value to be emitted to the rawStream
    // this keeps rawStream's length and characterScanned consistent
    this.rawStream += value;
    this.emittedTokens.push(token);
    return token;
  };

  // throws an error if a rule has an invalid lookBehind
  private validateLookBehinds = () => {
    const ruleSetNames: Array<string> = Array.from(new Set(this.ruleSet.map((rule) => rule.name)));
    this.ruleSet.forEach((rule) => {
      const lookBehindRuleName = rule.lookBehind?.ruleName;
      if (lookBehindRuleName && !ruleSetNames.includes(lookBehindRuleName)) {
        throw new Error(`Rule ${JSON.stringify(rule)} has invalid lookBehind rule name '${lookBehindRuleName}'`);
      }
    });
  };

  // replace the escapeSeq when flushing to the internalInputBuffer and flush
  private flushMatchBufferToOutputBuffer = (): void => {
    this.internalOutputBuffer += this.internalMatchBuffer;
    this.internalMatchBuffer = '';
  };

  // flush the output buffer directly as a token
  private flushOutputBufferAsToken = (): Array<Token> => {
    if (this.internalOutputBuffer.length) {
      const returnToken = this.emitToken('', this.internalOutputBuffer);
      this.internalOutputBuffer = '';
      return [returnToken];
    }
    return [];
  };

  // reset all variables
  reset = (): void => {
    this.internalMatchedRules = [];
    this.flushMatchBufferToOutputBuffer();
    this.flushOutputBufferAsToken();
    this.emittedTokens = [];
    this.rawStream = '';
    this.scan(this.sofLiteral || '');
    this.charactersScanned = 0;
  };

  // only called when lookBehind exists
  // check the emittedTokens if the previous token matches the lookBehind of the current rule, or if
  // the outputStream's last characters matches the lookBehind of the current rule
  private checkLookBehind = (rule: Rule): boolean => {
    // use literal for look behind
    if (rule.lookBehind!.literal) {
      let lookBehindCheck = this.internalOutputBuffer;
      const dif = rule.lookBehind!.literal.length - lookBehindCheck.length;
      if (dif > 0) {
        lookBehindCheck = `${this.rawStream.slice(-dif)}${lookBehindCheck}`;
      }
      // append escape character if it's the last character before the literal
      const possibleEscapeChar = this.rawStream.slice(-dif - 1, -dif);
      if (possibleEscapeChar === this.escapeSeq) {
        lookBehindCheck += possibleEscapeChar;
      }
      if (lookBehindCheck === rule.lookBehind!.literal) {
        return true;
      }
      if (rule.lookBehind!.negative && lookBehindCheck !== rule.lookBehind!.literal) {
        return true;
      }
    } else {
      const lastToken = this.emittedTokens[this.emittedTokens.length - 1];
      if (lastToken) {
        if (lastToken.type === rule.lookBehind!.ruleName) {
          return true;
        }
        if (rule.lookBehind!.negative && lastToken.type !== rule.lookBehind!.ruleName) {
          return true;
        }
      }
    }
    return false;
  };

  // read current input and tokenize it
  // returns an array of tokens and keeps whatever's left in the match and output buffers
  private tokenize = (input: string): Array<Token> => {
    let returnTokens: Array<Token> = [];
    let inputToBeTokenized = input;
    // loop through entire input
    while (inputToBeTokenized.length) {
      // get the next character to be tokenized
      this.internalMatchBuffer += inputToBeTokenized[0];
      // pull character from inputToBeTokenized
      inputToBeTokenized = inputToBeTokenized.substring(1);
      // set rules to search through the smaller subset that had already matched
      let rules = this.internalMatchedRules;
      if (!rules.length) {
        rules = this.ruleSet;
      }

      // find all rules that the current matchBuffer can match
      const foundRules = rules.filter((rule: Rule): boolean => {
        if (this.internalMatchBuffer === rule.literal.slice(0, this.internalMatchBuffer.length)) {
          if (rule.lookBehind) {
            return this.checkLookBehind(rule);
          }
          return true;
        }
        return false;
      });

      // no matches found, so backtrack and find the first rule that matches the leftmost characters
      if (foundRules.length === 0) {
        // backtrack
        if (this.internalMatchedRules.length) {
          const foundRule = rules.find((rule: Rule): boolean => {
            if (rule.literal === this.internalMatchBuffer.slice(0, rule.literal.length)) {
              if (rule.lookBehind) {
                return this.checkLookBehind(rule);
              }
              return true;
            }
            return false;
          });

          // leftmost characters has a rule match during backtrack check
          if (foundRule) {
            // first, flush whatever is left in the output buffer as a token
            returnTokens = returnTokens.concat(this.flushOutputBufferAsToken());

            // then, get the leftmost characters that has matched and tokenize it
            const matchedLiteral = this.internalMatchBuffer.slice(0, foundRule.literal.length);
            returnTokens.push(this.emitToken(foundRule.name, matchedLiteral));

            // pull the matched leftmost characters from the internalMatchBuffer, reset internalMatchedRules
            this.internalMatchBuffer = this.internalMatchBuffer.substring(foundRule.literal.length);
            // make a copy of internalMatchBuffer tokenize() whatever's it anew
            const internalMatchBufferCopy = this.internalMatchBuffer;
            this.internalMatchBuffer = '';
            this.internalMatchedRules = [];
            returnTokens = returnTokens.concat(this.tokenize(internalMatchBufferCopy));
          } else if (this.internalMatchBuffer !== this.escapeSeq) {
            // backtrack yielded no results, so pull the first character from the matchBuffer and retry
            this.internalOutputBuffer += this.internalMatchBuffer[0];
            this.internalMatchBuffer = this.internalMatchBuffer.substring(1);
            // make a copy of internalMatchBuffer tokenize() whatever's it anew
            const internalMatchBufferCopy = this.internalMatchBuffer;
            this.internalMatchedRules = [];
            this.internalMatchBuffer = '';
            returnTokens = returnTokens.concat(this.tokenize(internalMatchBufferCopy));
          }
        } else if (this.internalMatchBuffer !== this.escapeSeq) {
          // flush whatever characters that don't have any matching rules at all
          this.flushMatchBufferToOutputBuffer();
          // reset rules
          this.internalMatchedRules = [];
        }
      } else if ((foundRules.length === 1) && (foundRules[0].literal === this.internalMatchBuffer)) {
        // only one rule matches and internalMatchBuffer matches the literal
        // emit blank token with internalInputBuffer contents if it's not empty
        returnTokens = returnTokens.concat(this.flushOutputBufferAsToken());
        returnTokens.push(this.emitToken(foundRules[0].name, this.internalMatchBuffer));
        // reset internalMatchBuffer
        this.internalMatchBuffer = '';
        // reset internalMatchedRules
        this.internalMatchedRules = [];
      } else {
        // multiple rules found, set internalMatchedRules to the new foundRules
        this.internalMatchedRules = foundRules;
      }
    }
    return returnTokens;
  };

  // tokenize() a chunk of input, then flushes whatever's left in the outputBuffer as a token
  scan = (input: string): Array<Token> => {
    return this.tokenize(input).concat(this.flushOutputBufferAsToken());
  };
}

export default Scanner;
