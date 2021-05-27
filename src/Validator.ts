// Validator.ts
import indexToCharSeq from './indexToCharSeq';

class Validator {
  private documentIDs: Array<string> = [];
  private footnoteKeys: { [key: string]: number } = {};
  private footnoteDefinitions: Array<string> = [];
  private citationKeys: { [key: string]: number } = {};
  private citationDefinitions: Array<string> = [];

  reset = () => {
    this.documentIDs = [];
    this.footnoteKeys = {};
    this.footnoteDefinitions = [];
    this.citationKeys = {};
    this.citationDefinitions = [];
  };

  validateID = (id: string): void => {
    if (!id) {
      throw new Error('Element ID cannot be blank.');
    } else if (/\s/.test(id)) {
      throw new Error(`ID '${id}' cannot contain whitespace.`);
    } else if (this.documentIDs.includes(id)) {
      throw new Error(`ID '${id}' is already assigned. IDs must be unique.`);
    }
    this.documentIDs.push(id);
  };

  valdiateCitationKey = (key: string) => {
    if (!key) {
      throw new Error('Citation cannot be blank.');
    } else if (this.footnoteKeys[key]) {
      throw new Error(`${key} - Citation cannot share a key with a foonote.`);
    }

    const refKey = this.citationKeys[key] + 1 || 1;
    this.citationKeys[key] = refKey;
    return indexToCharSeq(refKey - 1).toString();
  };

  validateCitationDefinition = (definition: string): number => {
    if (!definition) {
      throw new Error('Citation definition cannot be blank.');
    } else if (!this.citationKeys[definition]) {
      throw new Error(`${definition} - Citation must be used before being defined.`);
    } else if (this.footnoteDefinitions.includes(definition)) {
      throw new Error(`${definition} - Citation cannot share a key with a foonote.`);
    }
    this.citationDefinitions.push(definition);
    return this.citationKeys[definition];
  };

  validateFootnoteKey = (key: string): string => {
    if (!key) {
      throw new Error('Footnote cannot be blank.');
    } else if (this.citationKeys[key]) {
      throw new Error(`${key} - Footnote cannot share a key with a citation.`);
    } else if (/\s/.test(key)) {
      throw new Error(`${key} - Footnote cannot contain whitespace.`);
    } else if (/[^a-zA-Z0-9*✝‡§¶#]/.test(key)) {
      throw new Error(`${key} - Footnote can only contain alphanumeric characters`);
    }

    // return a ref key
    if (Number.isInteger(key)) {
      const refKey = this.footnoteKeys[key] + 1 || 1;
      this.footnoteKeys[key] = refKey;
      return indexToCharSeq(refKey - 1).toString();
    }
    const refKey = this.footnoteKeys[key] + 1 || 1;
    this.footnoteKeys[key] = refKey;
    return refKey.toString();
  };

  validateFootnoteDefinition = (definition: string): number => {
    if (!definition) {
      throw new Error('Footnote definition cannot be blank.');
    } else if (/\s/.test(definition)) {
      throw new Error(`${definition} - Footnote definition cannot contain whitespace.`);
    } else if (/[^a-zA-Z0-9*✝‡§¶#]/.test(definition)) {
      throw new Error(`${definition} - Footnote definition can only contain alphanumeric characters.`);
    } else if (!this.footnoteKeys[definition]) {
      throw new Error(`${definition} - Footnote must be used before being defined.`);
    } else if (this.citationDefinitions.includes(definition)) {
      throw new Error(`${definition} - Footnote definition cannot share a key with a citation.`);
    }
    this.footnoteDefinitions.push(definition);
    return this.footnoteKeys[definition];
  };
}

export default Validator;
