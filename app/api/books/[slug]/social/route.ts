import { z } from 'zod';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureJsonRequest, MAX_JSON_BODY_BYTES, noStoreJson, rateLimit, rateLimitedResponse, sameOrigin, validSlug } from '@/lib/security';
import { getUserByEmail } from '@/lib/db-users';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const commentSchema = z.object({
  type: z.literal('comment'),
  body: z.string().trim().min(2).max(1200),
});

const reactionSchema = z.object({
  type: z.literal('reaction'),
  reaction: z.enum(['LIKE', 'DISLIKE']),
});

async function findPublishedBook(slug: string) {
  const { data, error } = await supabaseAdmin
    .from('books')
    .select('id,title,status,is_free')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error('Book lookup failed.');
  if (!data || data.status !== 'PUBLISHED') return null;
  return data;
}

async function getSocialState(bookId: string, userId: string | null) {
  const [likesResult, dislikesResult, ownReactionResult, commentsResult] = await Promise.all([
    supabaseAdmin.from('book_reactions').select('id', { count: 'exact', head: true }).eq('book_id', bookId).eq('reaction', 'LIKE'),
    supabaseAdmin.from('book_reactions').select('id', { count: 'exact', head: true }).eq('book_id', bookId).eq('reaction', 'DISLIKE'),
    userId
      ? supabaseAdmin.from('book_reactions').select('reaction').eq('book_id', bookId).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabaseAdmin
      .from('book_comments')
      .select('id,body,created_at,users(name,image)')
      .eq('book_id', bookId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (likesResult.error || dislikesResult.error || ownReactionResult.error || commentsResult.error) {
    throw new Error('Social data lookup failed.');
  }

  return {
    counts: {
      likes: likesResult.count ?? 0,
      dislikes: dislikesResult.count ?? 0,
    },
    userReaction: (ownReactionResult.data?.reaction === 'LIKE' || ownReactionResult.data?.reaction === 'DISLIKE')
      ? ownReactionResult.data.reaction
      : null,
    comments: (commentsResult.data ?? []).map((item: any) => ({
      id: item.id,
      body: item.body,
      createdAt: item.created_at,
      user: {
        name: item.users?.name || 'Reader',
        image: item.users?.image || null,
      },
    })),
  };
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validSlug(slug)) return noStoreJson({ error: 'Book not found.' }, { status: 404 });
  const limited = rateLimit(request, `book-social-read:${slug}`, 120, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);

  try {
    const book = await findPublishedBook(slug);
    if (!book) return noStoreJson({ error: 'Book not found.' }, { status: 404 });

    const session = await auth();
    const email = session?.user?.email?.trim().toLowerCase();
    const user = email ? await getUserByEmail(email) : null;
    const state = await getSocialState(book.id, user?.id ?? null);
    return noStoreJson(state);
  } catch {
    console.error('Social GET failed');
    return noStoreJson({ error: 'Could not load reader community data.' }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validSlug(slug)) return noStoreJson({ error: 'Book not found.' }, { status: 404 });

  const limited = rateLimit(request, `book-social-write:${slug}`, 24, 60_000);
  if (!limited.ok) return rateLimitedResponse(limited.retryAfter);
  const jsonCheck = ensureJsonRequest(request, MAX_JSON_BODY_BYTES);
  if (!jsonCheck.ok) return jsonCheck.response;
  if (!sameOrigin(request)) return noStoreJson({ error: 'Cross-site request blocked.' }, { status: 403 });

  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email) return noStoreJson({ error: 'Please sign in with Google first.' }, { status: 401 });

  try {
    const user = await getUserByEmail(email);
    if (!user) return noStoreJson({ error: 'Your account is not ready yet. Please sign in again.' }, { status: 401 });

    const book = await findPublishedBook(slug);
    if (!book) return noStoreJson({ error: 'Book not found.' }, { status: 404 });

    const body = await request.json().catch(() => null);

    if (body?.type === 'comment' && !book.is_free) {
      const { data: purchase } = await supabaseAdmin
        .from('purchases')
        .select('id,order_id')
        .eq('user_id', user.id)
        .eq('book_id', book.id)
        .maybeSingle();
      if (!purchase) return noStoreJson({ error: 'Purchase the book before commenting.' }, { status: 403 });
      const { data: order } = await supabaseAdmin.from('orders').select('status').eq('id', purchase.order_id).maybeSingle();
      if (order?.status !== 'PAID') return noStoreJson({ error: 'Purchase the book before commenting.' }, { status: 403 });
    }
    const type = body?.type;

    if (type === 'reaction') {
      const parsed = reactionSchema.safeParse(body);
      if (!parsed.success) return noStoreJson({ error: 'Invalid reaction.' }, { status: 400 });

      const { data: current, error: currentError } = await supabaseAdmin
        .from('book_reactions')
        .select('reaction')
        .eq('book_id', book.id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (currentError) throw new Error('Reaction lookup failed.');

      if (current?.reaction === parsed.data.reaction) {
        const { error } = await supabaseAdmin.from('book_reactions').delete().eq('book_id', book.id).eq('user_id', user.id);
        if (error) throw new Error('Reaction delete failed.');
      } else {
        const { error } = await supabaseAdmin
          .from('book_reactions')
          .upsert({ book_id: book.id, user_id: user.id, reaction: parsed.data.reaction, updated_at: new Date().toISOString() }, { onConflict: 'book_id,user_id' });
        if (error) throw new Error('Reaction save failed.');
      }

      const state = await getSocialState(book.id, user.id);
      return noStoreJson({ counts: state.counts, userReaction: state.userReaction });
    }

    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) return noStoreJson({ error: 'Comment must be between 2 and 1200 characters.' }, { status: 400 });

    const cleanBody = parsed.data.body.replace(/\u0000/g, '').trim();
    const { data: inserted, error } = await supabaseAdmin
      .from('book_comments')
      .insert({ book_id: book.id, user_id: user.id, body: cleanBody })
      .select('id,body,created_at')
      .single();
    if (error || !inserted) throw new Error('Comment save failed.');

    return noStoreJson({
      comment: {
        id: inserted.id,
        body: inserted.body,
        createdAt: inserted.created_at,
        user: { name: user.name || 'Reader', image: user.image || null },
      },
    }, { status: 201 });
  } catch {
    console.error('Social POST failed');
    return noStoreJson({ error: 'Could not save your reaction or comment.' }, { status: 503 });
  }
}
