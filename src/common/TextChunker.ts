/**
 * Utility class for chunking long text into smaller pieces
 */
export class TextChunker {
  /**
   * Chunks text into smaller pieces with optional overlap
   */
  static chunkText(
    text: string,
    chunkSize: number = 500,
    overlap: number = 50
  ): Array<{ text: string; startIndex: number; endIndex: number }> {
    if (!text || text.length === 0) {
      return [];
    }

    const chunks: Array<{ text: string; startIndex: number; endIndex: number }> = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      const chunkText = text.slice(startIndex, endIndex);

      // Try to break at word boundaries if not at end
      if (endIndex < text.length && chunkText.length === chunkSize) {
        const lastSpaceIndex = chunkText.lastIndexOf(' ');
        if (lastSpaceIndex > chunkSize * 0.7) {
          // Only break at space if it's reasonably close to the end
          chunks.push({
            text: chunkText.slice(0, lastSpaceIndex + 1).trim(),
            startIndex,
            endIndex: startIndex + lastSpaceIndex + 1
          });
          startIndex = startIndex + lastSpaceIndex + 1 - overlap;
        } else {
          chunks.push({
            text: chunkText.trim(),
            startIndex,
            endIndex
          });
          startIndex = endIndex - overlap;
        }
      } else {
        chunks.push({
          text: chunkText.trim(),
          startIndex,
          endIndex
        });
        startIndex = endIndex;
      }

      // Avoid infinite loops
      if (chunks.length > 1000) {
        break;
      }
    }

    return chunks.filter(chunk => chunk.text.length > 0);
  }

  /**
   * Highlights matching terms in text (simple implementation)
   */
  static highlightText(text: string, queryTerms: string[]): string {
    if (!queryTerms || queryTerms.length === 0) {
      return text;
    }

    let highlighted = text;
    const lowerText = text.toLowerCase();

    // Sort by length (longer terms first) to avoid partial matches
    const sortedTerms = [...queryTerms].sort((a, b) => b.length - a.length);

    for (const term of sortedTerms) {
      if (!term || term.trim().length === 0) {
        continue;
      }

      const lowerTerm = term.toLowerCase();
      const regex = new RegExp(`(${this.escapeRegex(lowerTerm)})`, 'gi');
      
      // Find all matches and replace with highlighted version
      highlighted = highlighted.replace(regex, (match, p1, offset) => {
        // Preserve original casing
        const originalMatch = text.slice(offset, offset + match.length);
        return `<mark>${originalMatch}</mark>`;
      });
    }

    return highlighted;
  }

  /**
   * Extract snippet around matching text
   */
  static extractSnippet(
    text: string,
    queryTerms: string[],
    snippetLength: number = 150
  ): { snippet: string; startIndex: number; endIndex: number } | null {
    if (!text || !queryTerms || queryTerms.length === 0) {
      return null;
    }

    const lowerText = text.toLowerCase();
    let matchIndex = -1;

    // Find first match
    for (const term of queryTerms) {
      if (!term || term.trim().length === 0) {
        continue;
      }
      const index = lowerText.indexOf(term.toLowerCase());
      if (index !== -1 && (matchIndex === -1 || index < matchIndex)) {
        matchIndex = index;
      }
    }

    if (matchIndex === -1) {
      // No match found, return beginning of text
      return {
        snippet: text.slice(0, snippetLength) + (text.length > snippetLength ? '...' : ''),
        startIndex: 0,
        endIndex: Math.min(snippetLength, text.length)
      };
    }

    // Extract snippet centered around match
    const halfLength = Math.floor(snippetLength / 2);
    const startIndex = Math.max(0, matchIndex - halfLength);
    const endIndex = Math.min(text.length, matchIndex + halfLength);

    let snippet = text.slice(startIndex, endIndex);
    if (startIndex > 0) {
      snippet = '...' + snippet;
    }
    if (endIndex < text.length) {
      snippet = snippet + '...';
    }

    return {
      snippet: this.highlightText(snippet, queryTerms),
      startIndex,
      endIndex
    };
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

