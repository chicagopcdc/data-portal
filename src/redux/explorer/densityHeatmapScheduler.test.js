import { createDensityHeatmapScheduler } from './densityHeatmapScheduler';

function createDeferred() {
  /** @type {(value?: unknown) => void} */
  let resolve;
  /** @type {(reason?: unknown) => void} */
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function category(key) {
  return { key, fields: [`${key}.field`] };
}

/**
 * @param {(category: { key: string }) => Promise<unknown>} fetchCategory
 * @param {number} [concurrency]
 */
function createScheduler(fetchCategory, concurrency = 2) {
  return createDensityHeatmapScheduler({ concurrency, fetchCategory });
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('createDensityHeatmapScheduler', () => {
  it('starts D before C after D is prioritized and B completes', async () => {
    const started = [];
    /** @type {Record<string, ReturnType<typeof createDeferred>>} */
    const deferred = {};

    const scheduler = createScheduler(async (cat) => {
      started.push(cat.key);
      deferred[cat.key] = createDeferred();
      return deferred[cat.key].promise;
    });

    const runPromise = scheduler.run([
      category('A'),
      category('B'),
      category('C'),
      category('D'),
    ]);

    await flushMicrotasks();
    expect(started).toEqual(['A', 'B']);

    scheduler.prioritize('D');
    deferred.B.resolve();
    await flushMicrotasks();
    expect(started).toEqual(['A', 'B', 'D']);

    deferred.A.resolve();
    deferred.D.resolve();
    await flushMicrotasks();
    expect(started).toEqual(['A', 'B', 'D', 'C']);

    deferred.C.resolve();
    await runPromise;
  });

  it('picks FIFO work when nothing is prioritized', async () => {
    const started = [];
    /** @type {Record<string, ReturnType<typeof createDeferred>>} */
    const deferred = {};

    const scheduler = createScheduler(async (cat) => {
      started.push(cat.key);
      deferred[cat.key] = createDeferred();
      return deferred[cat.key].promise;
    });

    const runPromise = scheduler.run([
      category('A'),
      category('B'),
      category('C'),
    ]);

    await flushMicrotasks();
    expect(started).toEqual(['A', 'B']);

    deferred.A.resolve();
    await flushMicrotasks();
    expect(started).toEqual(['A', 'B', 'C']);

    deferred.B.resolve();
    deferred.C.resolve();
    await runPromise;
  });

  it('does not cancel in-flight fetches when a later category is prioritized', async () => {
    const started = [];
    const completed = [];
    /** @type {Record<string, ReturnType<typeof createDeferred>>} */
    const deferred = {};

    const scheduler = createScheduler(async (cat) => {
      started.push(cat.key);
      deferred[cat.key] = createDeferred();
      await deferred[cat.key].promise;
      completed.push(cat.key);
    });

    const runPromise = scheduler.run([
      category('A'),
      category('B'),
      category('C'),
      category('D'),
    ]);

    await flushMicrotasks();
    scheduler.prioritize('D');
    expect(started).toEqual(['A', 'B']);
    expect(completed).toEqual([]);

    deferred.B.resolve();
    await flushMicrotasks();
    expect(completed).toEqual(['B']);
    expect(started).toEqual(['A', 'B', 'D']);

    deferred.A.resolve();
    deferred.D.resolve();
    await flushMicrotasks();
    expect(completed).toEqual(expect.arrayContaining(['A', 'B', 'D']));
    deferred.C.resolve();
    await runPromise;
  });

  it('stops handing out new work after cancel() without aborting in-flight fetches', async () => {
    const started = [];
    const completed = [];
    /** @type {Record<string, ReturnType<typeof createDeferred>>} */
    const deferred = {};

    const scheduler = createScheduler(async (cat) => {
      started.push(cat.key);
      deferred[cat.key] = createDeferred();
      await deferred[cat.key].promise;
      completed.push(cat.key);
    });

    const runPromise = scheduler.run([
      category('A'),
      category('B'),
      category('C'),
      category('D'),
    ]);

    await flushMicrotasks();
    expect(started).toEqual(['A', 'B']);

    scheduler.cancel();
    deferred.A.resolve();
    deferred.B.resolve();
    await runPromise;

    expect(started).toEqual(['A', 'B']);
    expect(completed).toEqual(['A', 'B']);
  });
});
