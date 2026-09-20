import Link from 'next/link';
import type { Book } from '@/lib/types';

export function BookCard({ book }: { book: Book }) {
  return (
    <Link href={`/book/${book.slug}`} className="book-card">
      <div className="cover">
        <img src={book.cover} alt={book.title} loading="lazy" />
      </div>
      <div className="book-meta">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <span className="pill">{book.category}</span>
          <span style={{ fontSize: 11, color: '#777' }}>
            {book.free ? 'Free' : `$${book.price.toFixed(2)}`}
          </span>
        </div>
        <h3>{book.title}</h3>
        <p>by {book.author}</p>
      </div>
    </Link>
  );
}
