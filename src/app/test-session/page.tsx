'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestSession() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    const test = async () => {
      // Get session
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      const email = sessionData?.session?.user?.email;

      // Get links for this user
      let links = null;
      if (userId) {
        const { data, error } = await supabase
          .from('parent_student_links')
          .select('*')
          .eq('parent_id', userId);
        links = { data, error: error?.message };
      }

      // Get all links (no filter) - to check RLS
      const { data: allLinks, error: allLinksError } = await supabase
        .from('parent_student_links')
        .select('*');

      setInfo({
        hasSession: !!sessionData?.session,
        userId,
        email,
        linksForThisUser: links,
        allLinks: { data: allLinks, error: allLinksError?.message },
      });
    };

    test();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h1>Session Debug Info</h1>
      <pre style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px' }}>
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}
