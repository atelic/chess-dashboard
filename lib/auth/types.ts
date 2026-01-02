import 'next-auth';
import type { DefaultSession } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      chesscomUsername: string | null;
      lichessUsername: string | null;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    chesscomUsername?: string | null;
    lichessUsername?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    email?: string;
    chesscomUsername?: string | null;
    lichessUsername?: string | null;
  }
}
