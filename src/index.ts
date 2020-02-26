import { mapAsync } from './mapAsync';
export { mapAsync };

export class CursorBase<T> {
  buffer: Array<T> = [];

  async nextPage(): Promise<Array<T>> {
    throw new Error('CursorBase subclass must implement getPage and not call super');
  }

  public async *[Symbol.asyncIterator]() {
    while (true) {
      if (this.buffer.length) {
        yield this.buffer.shift();
        continue;
      }

      const page = await this.nextPage();
      if (!page.length) {
        break;
      }

      this.buffer = page;
    }
  }

  mapAsync<U>(
    callback: (value: T, index: number) => Promise<U>,
    concurrency: number,
  ): Promise<Array<U>> {
    return mapAsync(this as any, callback, concurrency);
  }
}
