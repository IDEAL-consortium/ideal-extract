/**
 * Minimal shape for OpenAI logprobs content items.
 * (works with Chat/Responses APIs that expose token + logprob)
 */
export interface LogprobToken {
  token: string;   // the detokenized text for this token (includes spaces/quotes/braces)
  logprob: number; // the log probability for this token
}

/**
 * Find the logprob of the FIRST token of the value for a given top-level key,
 * by scanning the logprobs token stream only (no JSON parsing).
 *
 * - `tokens`: choices[0].logprobs.content (ordered)
 * - `key`: the top-level key to look for
 * - `ignoreOpeningQuote`:
 *     If true and the value is a string, this returns the token that covers
 *     the first character *after* the opening quote. Note that the opening
 *     quote and the first character might still be in the same token; in that
 *     case you will get that same token’s logprob (there is no separate token).
 *
 * Returns `undefined` if the key or value start is not found.
 */
export function firstValueTokenLogprobByKey(
  tokens: ReadonlyArray<LogprobToken>,
  key: string,
  opts?: { ignoreOpeningQuote?: boolean }
): number | undefined {
  const ignoreOpeningQuote = opts?.ignoreOpeningQuote ?? true;

  // Precompute character spans for each token in the concatenated stream so that
  // once we know the character position of the value start, we can map back to the token.
  let spans: Array<{ start: number; end: number }> = [];
  {
    let pos = 0;
    for (const t of tokens) {
      const text = t.token ?? "";
      spans.push({ start: pos, end: pos + text.length });
      pos += text.length;
    }
  }

  // Scanner over the concatenated token text (character by character),
  // maintaining only enough JSON-ish state to find: "key" -> : -> value-start.
  let depth = 0;            // {} depth to ensure we are at top-level keys (depth === 1)
  let inString = false;     // whether we're inside a JSON string
  let escaping = false;     // whether the previous char was a backslash in a string
  let collectingKey = false;
  let keyBuf = "";
  let awaitingColon = false;
  let seekingValueStart = false;

  let globalPos = 0; // character offset from the beginning of the concatenated token stream

  for (let ti = 0; ti < tokens.length; ti++) {
    const text = tokens[ti].token ?? "";
    console.log("Token", ti, JSON.stringify(text), tokens[ti].logprob);
    for (let ci = 0; ci < text.length; ci++) {
      const ch = text[ci];

      if (inString) {
        if (escaping) {
          escaping = false;
          if (collectingKey) keyBuf += ch;
          globalPos++;
          continue;
        }
        if (ch === "\\") {
          escaping = true;
          globalPos++;
          continue;
        }
        if (ch === '"') {
          inString = false;
          if (collectingKey) {
            if (keyBuf === key && depth === 1) {
              awaitingColon = true; // next non-space ':' must appear
            }
            collectingKey = false;
            keyBuf = "";
          }
          globalPos++;
          continue;
        }
        if (collectingKey) keyBuf += ch;
        globalPos++;
        continue;
      }

      // Outside a string:

      // If we've just seen the key and are waiting for ':'
      if (awaitingColon) {
        if (/\s/.test(ch)) {
          globalPos++;
          continue;
        }
        if (ch === ":") {
          awaitingColon = false;
          seekingValueStart = true;
          globalPos++;
          continue;
        } else {
          // Not valid JSON, but stop waiting anyway.
          awaitingColon = false;
          globalPos++;
          continue;
        }
      }

      // If we're looking for the first non-space char of the value
      if (seekingValueStart) {
        if (/\s/.test(ch)) {
          globalPos++;
          continue;
        }
        // Found the very first character of the value
        let valueCharPos = globalPos;
        if (ignoreOpeningQuote && ch === '"') {
          valueCharPos += 1; // first char after the opening quote
        }

        // Map char position -> token index
        for (let idx = 0; idx < spans.length; idx++) {
          const s = spans[idx];
          if (s.start <= valueCharPos && valueCharPos < s.end) {
            return tokens[idx].logprob;
          }
        }
        return undefined; // no matching token span (shouldn't happen)
      }

      // Normal structural handling
      if (ch === '"') {
        inString = true;
        // Start collecting a potential key only when at top-level (depth === 1)
        // and we're not in the middle of key->: matching.
        if (depth === 1) {
          collectingKey = true;
          keyBuf = "";
        }
        globalPos++;
        continue;
      }

      if (ch === "{") {
        depth++;
        globalPos++;
        continue;
      }
      if (ch === "}") {
        if (depth > 0) depth--;
        globalPos++;
        continue;
      }

      // commas, brackets, other chars, and whitespace outside strings
      globalPos++;
    }
  }

  return undefined;
}

/* -------------------------
   Example usage
-------------------------- */

// Suppose you already have tokens from OpenAI like:
// const tokens = response.choices[0].logprobs!.content as LogprobToken[];

const demo: LogprobToken[] = [
  { token: "{", logprob: -0.1 },
  { token: '"name"', logprob: -0.2 },
  { token: ": ", logprob: -0.3 },
  { token: '"Alice"', logprob: -0.4 },
  { token: ", ", logprob: -0.2 },
  { token: '"age"', logprob: -0.25 },
  { token: ": ", logprob: -0.31 },
  { token: "30", logprob: -0.6 },
  { token: "}", logprob: -0.1 },
];

// First token of the value for name (this will be the token that includes the opening quote):
const lpName = firstValueTokenLogprobByKey(demo, "name"); // -> -0.4

// If you prefer to skip the opening quote for string values:
const lpNameNoQuote = firstValueTokenLogprobByKey(demo, "name", { ignoreOpeningQuote: true }); // -> -0.4 (same token if quote+char share a token)

// Non-string values work the same:
const lpAge = firstValueTokenLogprobByKey(demo, "age"); // -> -0.6


