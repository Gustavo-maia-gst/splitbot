/**
 * Splits a message into chunks that respect the Discord message limit (2000 chars).
 * It attempts to split by newlines first to keep paragraphs together.
 * If a single chunk is too large, it tries to split by spaces.
 * If a single word is too large, it hard splits.
 *
 * @param content The text content to split
 * @param maxLength The maximum length of each chunk (default 2000)
 * @returns Array of strings
 */
export function splitMessage(content: string, maxLength: number = 2000): string[] {
  if (!content) return [];
  if (content.length <= maxLength) return [content];

  const chunks: string[] = [];
  let currentChunk = '';

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // If we add this line + newline to currentChunk, will it exceed max?
    const separator = currentChunk ? '\n' : '';
    const potentialChunk = `${currentChunk}${separator}${line}`;

    if (potentialChunk.length <= maxLength) {
      currentChunk = potentialChunk;
    } else {
      // Current line doesn't fit in the remaining space.

      // 1. Push whatever we have so far
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // 2. Handle the line itself
      if (line.length <= maxLength) {
        currentChunk = line;
      } else {
        // Line is too long, split by words
        const words = line.split(' ');

        for (let j = 0; j < words.length; j++) {
          const word = words[j];
          const wordSep = currentChunk ? ' ' : '';
          const potentialWordChunk = `${currentChunk}${wordSep}${word}`;

          if (potentialWordChunk.length <= maxLength) {
            currentChunk = potentialWordChunk;
          } else {
            // Word doesn't fit in currentChunk
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = '';
            }

            // Check if word itself is too long
            if (word.length > maxLength) {
              // Hard split the word
              let remaining = word;
              while (remaining.length > 0) {
                if (remaining.length <= maxLength) {
                  currentChunk = remaining;
                  remaining = '';
                } else {
                  chunks.push(remaining.slice(0, maxLength));
                  remaining = remaining.slice(maxLength);
                }
              }
            } else {
              currentChunk = word;
            }
          }
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
