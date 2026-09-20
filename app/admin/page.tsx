'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Check, FileText, ImagePlus, Loader2, Plus, Search, X, Trash2, BarChart3, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Book } from '@/lib/types';

type SignedUpload = { path: string; token: string; bucket: string };

const emptyForm = {
  title: '',
  author: '',
  description: '',
  category: '',
  price: '4.99',
  free: false,
  featured: false,
  content: '',
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

async function getSignedUpload(file: File, kind: 'cover' | 'pdf') {
  return apiJson<SignedUpload>('/api/admin/storage/presign', {
    method: 'POST',
    body: JSON.stringify({ name: file.name, type: file.type || (kind === 'pdf' ? 'application/pdf' : 'image/jpeg'), kind }),
  });
}

export default function AdminPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [cover, setCover] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const coverInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);

  async function loadCategories() {
    try {
      const response = await fetch('/api/categories', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (response.ok) setCategories(Array.isArray(data.categories) ? data.categories : []);
    } catch {}
  }

  async function load() {
    try {
      const data = await apiJson<{ books: Book[] }>('/api/admin/books');
      setBooks(data.books || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load admin books.');
    }
  }

  useEffect(() => { void Promise.all([load(), loadCategories()]); }, []);

  useEffect(() => {
    if (!form.category && categories.length > 0) {
      setForm((current) => ({ ...current, category: categories[0] }));
    }
  }, [categories, form.category]);

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  const paid = useMemo(() => books.filter((b) => !b.free).length, [books]);
  const free = useMemo(() => books.filter((b) => b.free).length, [books]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(q));
  }, [books, search]);

  function chooseCover(file: File | null) {
    setCover(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : '');
  }

  function resetForm() {
    setEditingSlug(null);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setForm(emptyForm);
    setCover(null);
    setPdf(null);
    setCoverPreview('');
    setProgress(0);
    setStatus('');
    setError('');
  }

  async function uploadFile(file: File, kind: 'cover' | 'pdf') {
    const signed = await getSignedUpload(file, kind);
    const { error: uploadError } = await supabase.storage
      .from(signed.bucket)
      .uploadToSignedUrl(signed.path, signed.token, file, {
        upsert: false,
        contentType: file.type,
      });
    if (uploadError) throw new Error(uploadError.message);
    return signed.path;
  }

  async function deleteBook(slug: string, title: string) {
    if (!window.confirm(`Delete \"${title}\" permanently? This also removes its stored cover and PDF.`)) return;
    setError(''); setStatus('Deleting book…');
    try {
      const response = await fetch('/api/admin/books', { method: 'DELETE', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ slug }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Book could not be deleted.');
      setStatus('Book deleted.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Book could not be deleted.'); setStatus(''); }
  }

  async function editBook(slug: string) {
    setError('');
    setStatus('');
    if (!form.title.trim() || !form.author.trim() || !form.description.trim() || !form.category.trim()) {
      setError('Enter the title, author, description and category.');
      return;
    }
    setUploading(true);
    try {
      let coverKey: string | undefined;
      let pdfKey: string | undefined;
      if (cover) {
        setStatus('Uploading the new cover…');
        coverKey = await uploadFile(cover, 'cover');
      }
      if (pdf) {
        if (!pdf.name.toLowerCase().endsWith('.pdf')) throw new Error('The e-book file must be a PDF.');
        setStatus('Uploading the new PDF…');
        pdfKey = await uploadFile(pdf, 'pdf');
      }
      setStatus('Saving changes…');
      await apiJson('/api/admin/books', {
        method: 'PATCH',
        body: JSON.stringify({
          slug,
          title: form.title.trim(),
          authorName: form.author.trim(),
          description: form.description.trim(),
          category: form.category,
          price: Number(form.price || 0),
          free: form.free,
          featured: form.featured,
          content: form.content.trim(),
          ...(coverKey ? { coverKey } : {}),
          ...(pdfKey ? { pdfKey, fileName: pdf.name, fileSize: pdf.size } : {}),
        }),
      });
      setStatus('Book updated successfully.');
      setProgress(100);
      await load();
      window.setTimeout(() => { setShowForm(false); resetForm(); }, 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Book update failed.');
      setStatus('');
    } finally {
      setUploading(false);
    }
  }

  async function openEdit(book: Book) {
    setError('');
    setStatus('');
    setEditingSlug(book.slug);
    setForm({
      title: book.title,
      author: book.author,
      description: book.description,
      category: book.category,
      price: String(book.price),
      free: book.free,
      featured: Boolean(book.featured),
      content: book.content || '',
    });
    chooseCover(null);
    setPdf(null);
    setProgress(0);
    setShowForm(true);
  }

  async function uploadBook() {
    setError('');
    setStatus('');

    if (!form.title.trim() || !form.author.trim() || !form.description.trim() || !form.category.trim()) {
      setError('Enter the title, author and description.');
      return;
    }
    if (!cover) {
      setError('Choose a cover image from your device.');
      return;
    }
    if (!pdf) {
      setError('Choose the e-book PDF from your device.');
      return;
    }
    if (!pdf.name.toLowerCase().endsWith('.pdf')) {
      setError('The e-book file must be a PDF.');
      return;
    }

    setUploading(true);

    try {
      setStatus('Uploading cover to Supabase Storage…');
      setProgress(15);
      const coverKey = await uploadFile(cover, 'cover');

      setStatus('Uploading PDF directly to Supabase Storage…');
      setProgress(20);
      const pdfKey = await uploadFile(pdf, 'pdf');

      setStatus('Saving book metadata to Supabase…');
      setProgress(80);

      await apiJson('/api/admin/books', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title.trim(),
          authorName: form.author.trim(),
          description: form.description.trim(),
          category: form.category,
          price: form.free ? 0 : Number(form.price || 0),
          free: form.free,
          featured: form.featured,
          content: form.content.trim(),
          coverKey,
          pdfKey,
          fileName: pdf.name,
          fileSize: pdf.size,
        }),
      });

      setProgress(100);
      setStatus('Book uploaded and published successfully.');
      await load();
      window.setTimeout(() => {
        setShowForm(false);
        resetForm();
      }, 900);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Book upload failed.');
      setStatus('');
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="admin-shell">
      <div className="admin-wrap">
        <div className="admin-topbar">
          <div>
            <div className="eyebrow" style={{ color: '#888' }}>Administrator only</div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 500, fontSize: 'clamp(38px, 5vw, 58px)', letterSpacing: '-.05em', margin: '10px 0 8px' }}>
              Rhythm Read Admin
            </h1>
            <p className="admin-subtitle">You control the entire book catalog.</p>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}><Link href="/admin/analytics" className="admin-back-btn"><BarChart3 size={15}/> Analytics</Link><Link href="/" className="admin-back-btn"><ArrowLeft size={15} /> Back to site</Link></div>
        </div>

        <div className="admin-grid">
          <aside className="admin-side glass">
            <div className="admin-side-brand"><BookOpen size={16} /><strong>RHYTHMREAD</strong></div>
            <div className="admin-nav-list">
              {['Overview', 'Books', 'Categories', 'Orders', 'Users', 'Reviews', 'Analytics', 'Settings', 'Audit log'].map((item) => (
                <button key={item} type="button" className={`admin-nav-item ${item === 'Books' ? 'active' : ''}`}>{item}</button>
              ))}
            </div>
          </aside>

          <section>
            <div className="stat-grid">
              <div className="stat"><span>Total books</span><strong>{books.length}</strong></div>
              <div className="stat"><span>Paid books</span><strong>{paid}</strong></div>
              <div className="stat"><span>Free books</span><strong>{free}</strong></div>
              <div className="stat"><span>Categories</span><strong>{categories.length}</strong></div>
            </div>

            <div className="admin-toolbar">
              <div>
                <div className="toolbar-title">Book catalog</div>
                <div className="toolbar-copy">Only the administrator can upload or publish books.</div>
              </div>
              <button type="button" className="btn btn-light" onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus size={16} /> Add book
              </button>
            </div>

            <div className="admin-search-box">
              <Search size={16} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search books, authors or categories..." />
            </div>

            {(error || status) && (
              <div className={error ? 'admin-upload-status error' : 'admin-upload-status'}>{error || status}</div>
            )}

            {showForm && (
              <div className="admin-form-card">
                <div className="admin-form-header">
                  <div>
                    <div className="eyebrow" style={{ color: '#999' }}>Administrator</div>
                    <h2>{editingSlug ? 'Edit e-book' : 'Add an e-book'}</h2>
                    <p>{editingSlug ? 'Update the title, description, category, price or replace the cover/PDF.' : 'Cover and PDF upload directly to the private Supabase Storage bucket.'}</p>
                  </div>
                  <button type="button" className="admin-icon-btn" disabled={uploading} onClick={() => { setShowForm(false); resetForm(); }}><X size={18} /></button>
                </div>

                <div className="admin-form-grid">
                  <label><span>Book title *</span><input className="admin-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
                  <label><span>Author *</span><input className="admin-input" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} /></label>
                  <label><span>Category *</span><select className="admin-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
                  <label><span>Price (USD)</span><input className="admin-input" type="number" min="0" step="0.01" disabled={form.free} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>

                  <label className="admin-upload-box">
                    <ImagePlus size={22} />
                    <div><strong>{cover?.name || 'Choose cover image'}</strong><small>{editingSlug ? 'Optional: choose a replacement cover.' : 'PNG / JPG / WEBP'}</small></div>
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => chooseCover(e.target.files?.[0] ?? null)} />
                  </label>

                  <label className="admin-upload-box">
                    <FileText size={22} />
                    <div><strong>{pdf?.name || 'Choose e-book PDF'}</strong><small>{editingSlug ? 'Optional: choose a replacement PDF.' : 'Direct-to-Supabase upload. No app-level MB cap.'}</small></div>
                    <input type="file" accept="application/pdf,.pdf" disabled={uploading} onChange={(e) => setPdf(e.target.files?.[0] ?? null)} />
                  </label>

                  {coverPreview && <div className="admin-cover-preview"><div className="admin-preview-label">Cover preview</div><img src={coverPreview} alt="Cover preview" /></div>}
                  {pdf && <div className="admin-file-info"><strong>PDF selected</strong><span>{pdf.name}</span><span>{(pdf.size / 1024 / 1024).toFixed(2)} MB</span></div>}

                  <label className="admin-span-2"><span>Description *</span><textarea className="admin-input admin-textarea" rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
                  <label className="admin-span-2"><span>Reader introduction</span><textarea className="admin-input admin-textarea" rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></label>

                  <div className="admin-options admin-span-2">
                    <label className="admin-check"><input type="checkbox" checked={form.free} onChange={(e) => setForm({ ...form, free: e.target.checked })} /><span>Free online read</span></label>
                    <label className="admin-check"><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /><span>Featured book</span></label>
                  </div>

                  <div className="admin-progress admin-span-2">
                    <div className="admin-progress-meta"><span>{status || 'Ready'}</span><strong>{progress}%</strong></div>
                    <div className="admin-progress-track"><div style={{ width: `${progress}%` }} /></div>
                  </div>

                  <div className="admin-form-actions admin-span-2">
                    <button type="button" className="btn" disabled={uploading} onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
                    <button type="button" className="btn btn-light" disabled={uploading} onClick={() => void (editingSlug ? editBook(editingSlug) : uploadBook())}>
                      {uploading ? <><Loader2 className="spin" size={16} /> Saving…</> : <><Check size={16} /> {editingSlug ? 'Save changes' : 'Upload & publish'}</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="admin-table-card">
              <div className="admin-table-header"><div><strong>Owned catalog</strong><span>{filtered.length} titles</span></div></div>
              <div style={{ overflowX: 'auto' }}>
                <table className="table"><thead><tr><th>Book</th><th>Author</th><th>Category</th><th>Type</th><th>Price</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {filtered.map((book) => (
                      <tr key={book.id}>
                        <td><div className="admin-book-cell"><div className="admin-thumb"><img src={book.cover} alt="" /></div><div><strong>{book.title}</strong><small>Admin-owned</small></div></div></td>
                        <td>{book.author}</td><td>{book.category}</td><td>{book.free ? 'Free' : 'Paid'}</td><td>{book.free ? '—' : `$${book.price.toFixed(2)}`}</td><td><span className="status-pill">Published</span></td><td><div style={{display:'flex',gap:8}}><button type="button" className="admin-edit-btn" title="Edit book" onClick={() => void openEdit(book)}><Pencil size={15}/></button><button type="button" className="admin-delete-btn" title="Delete book" onClick={() => void deleteBook(book.slug, book.title)}><Trash2 size={15}/></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
