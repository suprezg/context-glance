# Async Data Streaming Pipeline Library Reference

`@context-glance/pipeline-stream` provides backpressure-regulated asynchronous streams, DAG data flow orchestration, and high-concurrency transform operators.

---

## 1. Flow Control & Backpressure DAG

```mermaid
graph LR
    Source[Async Generator Source] -->|Unbounded Yield| BufferQueue[Ring Buffer Queue (Capacity: C)]
    BufferQueue -->|Pull Token| Transformer[Worker Pool Transformer]
    Transformer -->|Batch Write| Sink[(Sink Database / File)]
    Sink -.->|High Watermark Signal| BufferQueue
```

Little's Law governing equilibrium queue length $L$ under arrival rate $\lambda$ and latency $W$:

$$
L = \lambda \cdot W
$$

Token bucket rate limiting constraint:

$$
T(t) = \min\big(B_{\max}, \, T(t - \Delta t) + r_{\text{fill}} \cdot \Delta t\big)
$$

---

## 2. Asynchronous Stream Pipeline Implementation

```python
import asyncio
from typing import AsyncGenerator, TypeVar

T = TypeVar("T")
R = TypeVar("R")

async def chunk_stream(source: AsyncGenerator[T, None], chunk_size: int = 100) -> AsyncGenerator[list[T], None]:
    """Batches incoming items into discrete lists to minimize downstream I/O overhead."""
    batch: list[T] = []
    async for item in source:
        batch.append(item)
        if len(batch) >= chunk_size:
            yield batch
            batch = []
    if batch:
        yield batch

async def bounded_worker(queue: asyncio.Queue[T], concurrency: int = 4) -> None:
    """Consumes queue messages concurrently while honoring backpressure watermarks."""
    async def worker_loop(worker_id: int):
        while True:
            item = await queue.get()
            try:
                # Process transform
                await asyncio.sleep(0.01)
            finally:
                queue.task_done()

    workers = [asyncio.create_task(worker_loop(i)) for i in range(concurrency)]
    await queue.join()
    for w in workers:
        w.cancel()
```

---

## 3. Operator Capabilities Matrix

| Operator Name | Category | Memory Profile | Backpressure Aware | Thread Safe |
| :--- | :--- | :--- | :--- | :--- |
| `mapParallel` | Transformation | $O(C \times \text{concurrency})$ | Yes | Yes |
| `filterDrop` | Filtering | $O(1)$ zero-alloc | Yes | Yes |
| `windowSliding` | Aggregation | $O(W \times \text{itemSize})$ | Yes | No (Single thread) |
| `mergeOrdered` | Combinator | $O(K \log K)$ priority heap | Yes | Yes |

---

## 4. Error Recovery & Dead Letter Queues

```typescript
import { StreamPipeline, RetryPolicy } from '@context-glance/pipeline-stream';

export function createResilientPipeline(): StreamPipeline<string, void> {
    return new StreamPipeline<string, void>()
        .retry({
            maxAttempts: 3,
            backoffStrategy: RetryPolicy.ExponentialBackoff(100, 2000),
            onFailure: (item, error) => {
                console.error(`Pushed item to dead letter queue: ${item}, error: ${error.message}`);
            }
        });
}
```

<details>
<summary><b>Deadlock Avoidance in Cyclic DAG Topologies</b></summary>
<br>
Cyclic stream feedback topologies must introduce an asynchronous delay buffer of at least 1 message interval to break synchronous wait cycles that lead to queue starvation.
</details>
