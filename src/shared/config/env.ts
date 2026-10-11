import { parseEnv } from './parse-env';

/** Validated once at startup: a broken .env crashes the app here, not somewhere at runtime. */
export const ENV = parseEnv(import.meta.env);
