declare const Deno: any;

declare module 'https://deno.land/*' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
  export function createHash(algorithm: string): {
    update(value: string): { digest(encoding: string): string };
  };
}

declare module 'https://esm.sh/*' {
  export function createClient(...args: any[]): any;
  export type SupabaseClient = any;
}
