export type Book = {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string;
  cover: string;
  category: string;
  price: number;
  free: boolean;
  featured?: boolean;
  content: string;
  pdfUrl?: string;
  fileName?: string;
  fileSize?: number;
};
