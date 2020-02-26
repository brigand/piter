piter allows abstract pagination with the convenience of async iterators.

```js
import { CursorBase } from 'piter';

class Example extends CursorBase {
  pageSize = 10;
  offset = 0;

  async nextPage() {
    const array = await getData({ pageSize: this.pageSize, offset: this.offset });
    this.offset += array.length;
    return array;
  }
}

// Iterate over potentially hundreds of results in a flattened async iterator.
for await (const record of new Example()) {
  console.log(record);

  // This will slow down fetching of additional data
  await delay(100);
}

// This will allow you to process 5 items at any time
const CONCURRENCY = 5;
new Example().mapAsync(async (record, index) => {
  console.log(record);

  // This will slow down fetching of additional data, but
  // 5 of these delays can run concurrently
  await delay(500);
}, CONCURRENCY);
```
