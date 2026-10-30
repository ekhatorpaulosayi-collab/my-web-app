interface DenoEnv {
  get(name: string): string | undefined;
  set(name: string, value: string): void;
  has(name: string): boolean;
  toObject(): Record<string, string>;
}

interface DenoNamespace {
  env: DenoEnv;
  args: string[];
  pid: number;
  serve(handler: (req: Request) => Response | Promise<Response>): void;
  exit(code?: number): never;
  cwd(): string;
  resolveDns(hostname: string, recordType: 'TXT'): Promise<string[][]>;
  resolveDns(hostname: string, recordType: 'A' | 'AAAA' | string): Promise<string[]>;
}

declare const Deno: DenoNamespace;

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
