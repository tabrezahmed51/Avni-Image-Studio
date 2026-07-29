export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  isAdmin?: boolean;
  adminRole?: 'superadmin' | 'admin' | 'moderator';
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
}
