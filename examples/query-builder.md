# Type-Safe Relational Query Builder Reference

`@context-glance/query-builder` is an expressive, zero-overhead relational database query compiler that guarantees compile-time schema safety and dialect emission.

---

## 1. Query Compilation AST Pipeline

```mermaid
graph TD
    TypeScriptFluent[TypeScript Fluent API: db.select(...)] --> Tokenizer[AST Query Tokenizer]
    Tokenizer --> TypeChecker[Schema Type Validator]
    TypeChecker --> Optimizer[Predicate Pushdown Optimizer]
    Optimizer --> DialectEmitter{Target Dialect}
    DialectEmitter -->|PostgreSQL| PgSQL[Parameterized SQL + $1, $2]
    DialectEmitter -->|SQLite| SqliteSQL[Parameterized SQL + ?]
    DialectEmitter -->|MySQL| MySqlSQL[Parameterized SQL + ?]
```

Relational algebra projection and join equivalence:

$$
\pi_{A_1, \dots, A_n}\Big(\sigma_{\theta_1 \land \theta_2}(R \bowtie_J S)\Big) \equiv \pi_{A_1, \dots, A_n}\Big(\sigma_{\theta_1}(R) \bowtie_J \sigma_{\theta_2}(S)\Big)
$$

---

## 2. Type-Safe Query Construction Example

```typescript
import { createDatabaseClient, sql } from '@context-glance/query-builder';

interface UserSchema {
    id: string;
    email: string;
    createdAt: Date;
    status: 'active' | 'suspended';
}

const db = createDatabaseClient<UserSchema>({ dialect: 'sqlite' });

export async function fetchActiveUsers(domain: string): Promise<UserSchema[]> {
    const query = db
        .selectFrom('users')
        .select(['id', 'email', 'createdAt'])
        .where('status', '=', 'active')
        .where('email', 'like', `%@${domain}`)
        .orderBy('createdAt', 'desc')
        .limit(50);

    const { text, values } = query.compile();
    console.log(`Generated SQL: ${text}`);
    return await db.execute(text, values);
}
```

---

## 3. Supported Dialect Features Matrix

| Feature Set | PostgreSQL | SQLite | MySQL 8.0 | DuckDB |
| :--- | :--- | :--- | :--- | :--- |
| Common Table Expressions (WITH RECURSIVE) | Supported | Supported | Supported | Supported |
| Window Functions (`OVER (PARTITION BY)`) | Supported | Supported | Supported | Supported |
| JSON Path Extraction (`->>`) | Supported | Supported (`json_extract`) | Supported | Supported |
| RETURNING Clause | Supported | Supported ($>= 3.35$) | Not Supported | Supported |

---

## 4. Migration & Transaction Management

```typescript
import { Transaction } from '@context-glance/query-builder';

export async function transferBalance(
    tx: Transaction,
    fromUserId: string,
    toUserId: string,
    amountCents: number
): Promise<void> {
    await tx.update('accounts')
        .set(sql`balance = balance - ${amountCents}`)
        .where('userId', '=', fromUserId)
        .execute();

    await tx.update('accounts')
        .set(sql`balance = balance + ${amountCents}`)
        .where('userId', '=', toUserId)
        .execute();
}
```

<details>
<summary><b>Deadlock Detection in Concurrent Transactions</b></summary>
<br>
Transactions must acquire locks in lexicographical table and primary key order ($K_1 < K_2$) to guarantee that wait-for graphs remain strictly acyclic, eliminating the possibility of circular deadlock conditions.
</details>
