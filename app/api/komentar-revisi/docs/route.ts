import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Scope 'drive' penuh (bukan readonly) — dibutuhkan untuk comments.create / replies.create.
// Instance auth terpisah dari route lain (mis. extract-poin) yang cuma perlu readonly.
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

// ── GET: daftar komentar Google Docs (native) untuk satu docsId ──
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const docsId = searchParams.get('docsId')?.trim();
    if (!docsId) {
      return NextResponse.json({ message: 'docsId wajib diisi.' }, { status: 400 });
    }

    const auth  = getAuth();
    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.comments.list({
      fileId: docsId,
      includeDeleted: false,
      pageSize: 100,
      fields: 'comments(id,content,createdTime,resolved,author(displayName),' +
              'quotedFileContent(value),replies(id,content,author(displayName),createdTime))',
    });

    const comments = (res.data.comments || []).map(c => ({
      id:          c.id || '',
      content:     c.content || '',
      createdTime: c.createdTime || '',
      resolved:    !!c.resolved,
      author:      c.author?.displayName || 'Tidak diketahui',
      quoted:      c.quotedFileContent?.value || '',
      replies: (c.replies || []).map(r => ({
        id:          r.id || '',
        content:     r.content || '',
        author:      r.author?.displayName || 'Tidak diketahui',
        createdTime: r.createdTime || '',
      })),
    }));

    // urut kronologis lama → baru (selaras dgn panel chat kita)
    comments.sort((a, b) => new Date(a.createdTime || 0).getTime() - new Date(b.createdTime || 0).getTime());

    return NextResponse.json({ data: comments });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ── POST: kirim komentar baru / balasan ke Google Docs ────────────
// Nama pengirim disisipkan manual ke isi teks, karena penulis resmi
// di Drive API selalu tercatat sebagai service account, bukan orangnya.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const docsId           = String(body.docsId || '').trim();
    const content           = String(body.content || '').trim();
    const namaPengirim      = String(body.namaPengirim || '').trim();
    const replyToCommentId  = String(body.replyToCommentId || '').trim();

    if (!docsId) return NextResponse.json({ message: 'docsId wajib diisi.' }, { status: 400 });
    if (!content) return NextResponse.json({ message: 'Isi komentar tidak boleh kosong.' }, { status: 400 });
    if (content.length > 2000) {
      return NextResponse.json({ message: 'Komentar terlalu panjang (maks 2000 karakter).' }, { status: 400 });
    }

    const auth  = getAuth();
    const drive = google.drive({ version: 'v3', auth });
    const prefixed = namaPengirim ? `[${namaPengirim}] ${content}` : content;

    if (replyToCommentId) {
      const r = await drive.replies.create({
        fileId: docsId,
        commentId: replyToCommentId,
        requestBody: { content: prefixed },
        fields: 'id,content,author(displayName),createdTime',
      });
      return NextResponse.json({ data: r.data });
    }

    const r = await drive.comments.create({
      fileId: docsId,
      requestBody: { content: prefixed },
      fields: 'id,content,author(displayName),createdTime',
    });
    return NextResponse.json({ data: r.data });

  } catch (err) {
    return NextResponse.json({
      error: String(err),
      message: 'Gagal mengirim ke Google Docs. Pastikan service account punya akses edit ke dokumen ini.',
    }, { status: 500 });
  }
}