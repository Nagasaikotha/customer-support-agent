// what c.get/c.set carry on Hono's context. auth middleware fills these in
// after verifying the JWT, everything downstream just reads from here
// instead of re-parsing the token itself
export interface AppEnv {
  Variables: {
    userId: number;
    userEmail: string;
  };
}
