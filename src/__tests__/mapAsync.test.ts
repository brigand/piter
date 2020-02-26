import { mapAsync } from '../mapAsync';
import { channel, defer } from '../channel';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function deferSet<T>(count: number) {
  const set = Array.from({ length: count }, () => {
    const [p, ok, err] = defer();
    return { p, ok, err };
  });

  const setMut = set.slice();

  return {
    promise(index: number) {
      return set[index].p;
    },
    ok(index: number, value: T) {
      set[index].ok(value);
    },
    okNext(value: T) {
      setMut.shift()!.ok(value);
    },
    err(index: number, value: any) {
      set[index]!.err(value);
    },
    errNext(value: any) {
      setMut.shift()!.err(value);
    },
  };
}

describe('mapAsync', () => {
  it(`works in simple channel case`, async () => {
    const results: Array<any> = [];
    const running: Array<any> = [];
    const input = [1, 2, 3, 4, 5, 6, 7];

    const [tx, rx] = channel();

    let complete = false;
    const onDone = (result: any) => {
      complete = true;
      return result;
    };

    const defers = deferSet(input.length);

    const promise = mapAsync(
      rx,
      async (item, index) => {
        running.push(index);

        const result = await defers.promise(index);
        results.push(result);
      },
      3,
    ).then(onDone);
    expect(results).toEqual([]);
    expect(complete).toBe(false);

    await tx.send(input.shift());
    await tx.send(input.shift());
    await tx.send(input.shift());
    tx.send(input.shift());
    tx.send(input.shift());
    tx.send(input.shift());
    tx.send(input.shift());

    await delay(5);
    expect(results).toEqual([]);
    expect(running.length).toBe(3);
    expect(complete).toBe(false);

    await defers.okNext('a');

    await delay(5);
    expect(results).toEqual(['a']);
    expect(running.length).toBe(4);
    expect(complete).toBe(false);

    await defers.okNext('b');

    await delay(5);
    expect(results).toEqual(['a', 'b']);
    expect(running.length).toBe(5);
    expect(complete).toBe(false);

    await defers.okNext('c');
    await defers.okNext('d');

    await delay(5);
    expect(results).toEqual(['a', 'b', 'c', 'd']);
    expect(running.length).toBe(7);

    await defers.okNext('e');
    await defers.okNext('f');
    await defers.okNext('g');

    await tx.end();

    await delay(5);
    await promise;

    expect(complete).toBe(true);
  });
});
