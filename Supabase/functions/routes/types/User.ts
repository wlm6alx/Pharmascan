export interface User {
    id: string;
    name: string;
    surname: string | null;
    phone: string | null;
    username: string;
    email: string;
    password: string;
    role?: 'patient' | 'pharmacien' | 'admin';
    userState?: boolean;
    created_at?: string;
}