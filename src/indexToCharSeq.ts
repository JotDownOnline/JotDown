const indexToCharSeq = (index: number): string => {
  const div = Math.floor(index / 26);
  let returnString = '';
  if (div > 0) {
    returnString += indexToCharSeq(div - 1);
  }
  return returnString + String.fromCharCode((index % 26) + 97);
};

export default indexToCharSeq;
