const processPDF = async (documentId, filePath) => {
  try {
    let { text } = await extractTextFromPDF(filePath);

    //create chunks
    const chunks = await chunkText(text, 500, 50);

    //update document
    await Document.findByIdAndUpdate(documentId, {
      extractedText: text,
      chunks: chunks,
      status: "ready",
    });

    console.log(`Document ${documentId} processed successfully`);
  } catch (error) {
    console.log(`Error processing the document ${documentId}:`, error);

    await Document.findByIdAndUpdate(documentId, {
      status: "failed",
    });
  }
};
