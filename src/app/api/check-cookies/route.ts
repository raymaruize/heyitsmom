import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const cookies = req.cookies.getAll();
  const cookieObj: Record<string, string> = {};
  cookies.forEach(c => {
    cookieObj[c.name] = c.value.substring(0, 50) + '...';
  });

  return NextResponse.json({
    allCookies: cookieObj,
    cookieCount: cookies.length,
    supabaseCookies: cookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-')),
  });
}
