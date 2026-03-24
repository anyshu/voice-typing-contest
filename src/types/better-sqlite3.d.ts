declare module "better-sqlite3" {
  namespace Database {
    interface Statement {
      run(...params: unknown[]): { changes: number };
      get(...params: unknown[]): any;
      all(...params: unknown[]): any[];
    }
    interface Database {
      exec(sql: string): void;
      prepare(sql: string): Statement;
      close(): void;
    }
  }

  interface DatabaseConstructor {
    new (path: string): Database.Database;
  }

  const Database: DatabaseConstructor;
  export = Database;
}
