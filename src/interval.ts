import * as XRegExp from 'xregexp';

export interface Interval {
  from: {
    value: string,
    included: boolean
  };
  to: {
    value: string,
    included: boolean
  };
}

const semver = "(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(-(0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(\\.(0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(\\+[0-9a-zA-Z-]+(\\.[0-9a-zA-Z-]+)*)?";
const interval = XRegExp(`(?<leftBrace>  [\\(\\]\\[]  )
                          (?<fromValue>  ${semver}    )?
                          (?<delimeter>  ,\\s?         )?
                          (?<toValue>    ${semver}    )?
                          (?<rightBrace> [\\)\\]\\[]  )`, 'x');

export default function parse(text: string): (Interval | null) {
  const match = XRegExp.exec(text, interval) as any;
  if (!match) {
    return null;
  }

  return {
    from: {
      value: match.fromValue,
      included: match.leftBrace === '['
    },
    to: {
      value: match.toValue,
      included: match.rightBrace === ']'
    }
  };
}