  //check notes.md for RAG info.

  /**
   * split text into chunks for better AI processing
   * @param {string} text - Full text to Chunk
   * @param {number} chunkSize - Target size per chunk (in words)
   * @param {number} overlap - Number of words to overlap between chunks
   * @returns {Array<{content: string, chunkIndex: number, pageNumber: number}>}
   */


  export const chunkText = (text, chunkSize = 500, overlap = 50) => {
    if (!text || text.trim().length === 0) {
      return [];
    }

    //Clean text while preserving paragraph structure
    const cleanedText = text
      .replace(/\r\n/g, "\n")
      .replace(/\s+/g, " ")
      .replace(/\n /g, "\n")
      .replace(/ \n/g, "\n")
      .trim();

    //Try to split paragraphs(single or double newlines)
    const paragraphs = cleanedText
      .split(/\n+/)
      .filter((p) => p.trim().length > 0);
    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      const paragraphWords = paragraph.trim().split(/\s+/);
      const paragraphWordCount = paragraphWords.length;

      //If single paragraph exceeds chunk size, split it by words.
      if (paragraphWordCount > chunkSize) {
        chunks.push({
          content: currentChunk.join("\n\n"),
          chunkIndex: chunkIndex++,
          pageNumber: 0,
        });
        currentChunk = [];
        currentWordCount = 0;

        //split large paragraph into word-based chunks
        for (let i = 0; i < paragraphWords.length; i += chunkSize - overlap) {
          const chunkWords = paragraphWords.slice(i, i + chunkSize);
          chunks.push({
            content: chunkWords.join(" "),
            chunkIndex: chunkIndex++,
            pageNumber: 0,
          });

          if (i + chunkSize >= paragraphWords.length) break;
        }
        continue;
      }

      //if adding this paragraph exceeds chunk size, save current chunk
      if (
        currentWordCount + paragraphWordCount > chunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push({
          content: currentChunk.join("\n\n"),
          chunkIndex: chunkIndex++,
          pageNumber: 0,
        });

        //create overlap from previous chunk
        const prevChunkText = currentChunk.join(" ");
        const prevWords = prevChunkText.split(/\s+/);
        const overlapText = prevWords
          .slice(-Math.min(overlap, prevWords.length))
          .join(" ");

        currentChunk = [overlapText, paragraph.trim()];
        currentWordCount = overlapText.split(/\s+/).length + paragraphWordCount;
      } else {
        //Add paragraph to current chunk
        currentChunk.push(paragraph.trim());
        currentWordCount += paragraphWordCount;
      }
    }
    
    //add the last chunk
    if(currentChunk.length > 0){
      chunks.push({
          content: currentChunk.join('\n\n'),
          chunkIndex: chunkIndex,
          pageNumber: 0
      });
    }
    
    //fallback: if no chunks created, split by words
    if(chunks.length === 0 && cleanedText.length > 0){
      const allwords = cleanedText.split(/\s+/);
      for(let i = 0; i < allwords.length; i += (chunkSize - overlap)){
          const chunkWords = allwords.slice(i, i + chunkSize);
          chunks.push({
              content: chunkWords.join(' '),
              chunkIndex: chunkIndex++,
              pageNumber: 0
          });

          if(i + chunkSize >= allwords.length) break;
      }
    }
    
    return chunks;
  };
