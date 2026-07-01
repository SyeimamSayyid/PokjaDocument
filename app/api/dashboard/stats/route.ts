// app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server';
import { getDashboardStats, getSheetData } from '@/lib/sheet';

export async function GET() {
  try {
    const data = await getDashboardStats();
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil data dashboard' },
      { status: 500 }
    );
  }
}