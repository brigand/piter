type IntoIter<T> = { [Symbol.asyncIterator]: () => AsyncIterator<T> };

async function raceSplice(promises: Array<Promise<unknown>>) {
  const index = await Promise.race(
    promises.map((p, i) =>
      p.then(
        () => i,
        () => i,
      ),
    ),
  );
  promises.splice(index, 1);
}

export async function mapAsync<T, U>(
  iter: IntoIter<T>,
  callback: (value: T, index: number) => Promise<U>,
  concurrency: number,
): Promise<Array<U>> {
  const results: Array<U> = [];

  let running: Array<Promise<void>> = [];
  let error: null | [unknown] = null;
  let iteration = -1;
  for await (const item of iter) {
    iteration += 1;
    const index = iteration;

    if (error) {
      throw error[0];
    }

    while (running.length >= concurrency) {
      await raceSplice(running);
    }

    const promise = Promise.resolve()
      .then(() => callback(item, index))
      .then(
        (result) => {
          while (results.length + 1 < index) {
            (results as Array<any>).push(undefined);
          }
          results[index] = result;
        },
        (error2) => {
          error = [error2];
        },
      )
      .then(() => {
        running = running.filter((p) => p !== promise);
      });

    running.push(promise);
  }

  await Promise.all(running);

  if (error) {
    throw error[0];
  }

  return results;
}
