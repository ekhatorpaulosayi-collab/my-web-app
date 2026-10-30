declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function test(name: string, fn: () => void): void;
declare function beforeEach(fn: () => void): void;
declare function afterEach(fn: () => void): void;
declare const expect: any;
declare const jest: any;

declare module '@testing-library/react';
declare module '@storybook/react' {
  export type Meta<T = any> = any;
  export type StoryObj<T = any> = any;
}
declare module 'recharts';
declare module '@/config/supabase';
declare module '@/components/ui/card';
declare module '@/components/ui/tabs';
declare module '@/components/ui/progress';
declare module '@/components/ui/button';
declare module '@/components/AIChatAnalytics';
declare module '../hooks/useAuth';
declare module '../../hooks/useAuth';
declare module '../hooks/useUserStore';
declare module '../config/supabaseClient';
declare module '../../config/supabaseClient';
declare module '../../lib/supabase-client';
declare module '../ui/card';
declare module '../ui/button';
declare module '../ui/progress';
declare module './icons/SettingsSpark';
