'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DiagnosticPage() {
  const [diag, setDiag] = useState<any>(null);

  useEffect(() => {
    const runDiag = async () => {
      // Check cookies
      const cookies = document.cookie.split('; ').reduce((acc: any, cookie) => {
        const [name, value] = cookie.split('=');
        if (name) acc[name] = value ? value.substring(0, 30) + '...' : 'empty';
        return acc;
      }, {});

      // Check localStorage
      const localStorage_data: any = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          localStorage_data[key] = value.substring(0, 50) + (value.length > 50 ? '...' : '');
        }
      }

      // Try to get session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      // Check supabase client properties
      const user = sessionData?.session?.user;

      setDiag({
        hasSession: !!sessionData?.session,
        userId: user?.id,
        email: user?.email,
        sessionCreatedAt: user?.created_at,
        sessionLastSignInAt: user?.last_sign_in_at,
        sessionError: sessionError?.message,
        cookies,
        localStorage: localStorage_data,
      });
    };

    runDiag();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', fontSize: '12px' }}>
      <h1>🔍 Full Diagnostic Report</h1>
      <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', overflow: 'auto', maxHeight: '600px' }}>
        {JSON.stringify(diag, null, 2)}
      </pre>
      <hr />
      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>If cookies are empty → Session not being saved during login</li>
        <li>If localStorage is empty → Browser storage issue</li>
        <li>If hasSession=false → Auth failed silently</li>
      </ul>
    </div>
  );
}
