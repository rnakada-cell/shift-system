import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const passcode = body.passcode;

        // Manager passcode from environment or default
        const MANAGER_PASS = process.env.MANAGER_PASS || 'admin999';

        if (passcode === MANAGER_PASS) {
            const response = NextResponse.json({ success: true, redirect: '/manager' });
            
            // Set session for manager
            response.cookies.set('shift_system_session', 'manager', { 
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });

            return response;
        } else {
            return NextResponse.json({ success: false, message: 'パスコードが正しくありません' }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ success: false, message: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}
