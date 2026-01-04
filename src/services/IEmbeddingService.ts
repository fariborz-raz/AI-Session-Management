export interface IEmbeddingService {
  generateEmbedding(text: string): Promise<number[]>;
  cosineSimilarity(vecA: number[], vecB: number[]): number;
}

