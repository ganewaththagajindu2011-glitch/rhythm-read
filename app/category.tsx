import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCatalog, listCategories, categorySlug } from '@/lib/catalog';

export async function CategoryDirectory() {
  const [books, categories] = await Promise.all([getCatalog(), listCategories()]);
  return (
    <section className="category-directory glass" aria-labelledby="category-directory-title">
      <div>
        <div className="eyebrow">Browse by category</div>
        <h2 id="category-directory-title">Find your reading mood.</h2>
      </div>
      <div className="category-directory-grid">
        {categories.map((name) => {
          const count = books.filter((book) => book.category === name).length;
          return (
            <Link key={name} href={`/category/${categorySlug(name)}`} className="category-directory-card">
              <span>{name}</span>
              <small>{count} {count === 1 ? 'book' : 'books'}</small>
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
