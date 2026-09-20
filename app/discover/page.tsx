export const dynamic = 'force-dynamic';

import { BookCard } from '@/app/components/book-card';
import { listCategories } from '@/lib/catalog';
import { getCatalog } from '@/lib/catalog';

export default async function DiscoverPage({searchParams}:{searchParams:Promise<{category?:string;free?:string;q?:string}>}){
  const p=await searchParams;
  const books=await getCatalog();
  const categories=await listCategories();
  const filtered=books.filter(b=>(!p.category||b.category===p.category)&&(!p.free||(p.free==='true'?b.free:true))&&(!p.q||`${b.title} ${b.author} ${b.category}`.toLowerCase().includes(p.q.toLowerCase())));
  return <main><section style={{paddingTop:150}}><div className="container"><div className="eyebrow">Discover</div><h1 style={{fontFamily:'Georgia,serif',fontSize:'clamp(48px,7vw,84px)',fontWeight:500,letterSpacing:'-.06em',margin:'14px 0 22px'}}>Find your next read.</h1><p style={{color:'#707070',maxWidth:680,lineHeight:1.7}}>Browse premium editions, free online reads, and new voices from the Rhythm Read ecosystem.</p><form method="get" style={{display:'flex',gap:10,margin:'28px 0'}}><input name="q" defaultValue={p.q} placeholder="Search books, authors, categories…" style={{flex:1,padding:'14px 16px',borderRadius:14,border:'1px solid #ddd'}}/><button className="btn btn-dark">Search</button></form><div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:30}}><a className="pill" href="/discover">All</a>{categories.map(c=><a key={c} className="pill" href={`/discover?category=${encodeURIComponent(c)}`}>{c}</a>)}</div><div className="book-grid">{filtered.map(b=><BookCard key={b.id} book={b}/>)}</div>{filtered.length===0&&<div style={{padding:'80px 0',textAlign:'center',color:'#777'}}>No books matched that search.</div>}</div></section></main>
}
