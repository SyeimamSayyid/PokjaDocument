import { getSheetData } from '@/lib/sheet';
import { NextResponse } from 'next/server';


export async function GET() {
    try {
        const data = await getSheetData('Superadmin');
        return NextResponse.json({
            sukses: true,
            jumlahBaris: data.length,
            preview: data.slice(0, 3)
        });
    } catch (err) {
        return NextResponse.json({
            sukses: false,
            error: String(err)
        }, { status: 500 });
    }
}
