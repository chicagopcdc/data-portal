/**
 * @typedef {{ key: string, fields?: string[] }} DensityHeatmapCategory
 */

/**
 * Queue-based category scheduler: concurrency-limited workers, FIFO pending
 * work, and an explicit prioritize() that moves a pending category into a
 * priority FIFO. In-flight fetches are never cancelled by prioritize().
 *
 * @param {{
 *  concurrency?: number;
 *  fetchCategory: (category: DensityHeatmapCategory) => Promise<unknown>;
 * }} options
 */
export function createDensityHeatmapScheduler({
  concurrency = 2,
  fetchCategory,
}) {
  /** @type {DensityHeatmapCategory[]} */
  const pending = [];
  /** @type {DensityHeatmapCategory[]} */
  const priorityPending = [];
  let cancelled = false;

  function takeNext() {
    if (priorityPending.length > 0) return priorityPending.shift();
    if (pending.length > 0) return pending.shift();
    return undefined;
  }

  /**
   * Move a still-pending category onto the priority FIFO so the next free
   * worker takes it before remaining normal-FIFO work.
   * @param {string} categoryKey
   */
  function prioritize(categoryKey) {
    if (!categoryKey || cancelled) return;
    if (priorityPending.some((category) => category.key === categoryKey)) {
      return;
    }
    const index = pending.findIndex((category) => category.key === categoryKey);
    if (index === -1) return;
    const [category] = pending.splice(index, 1);
    priorityPending.push(category);
  }

  function cancel() {
    cancelled = true;
    pending.length = 0;
    priorityPending.length = 0;
  }

  /**
   * @param {DensityHeatmapCategory[]} categories
   */
  async function run(categories) {
    cancelled = false;
    pending.push(...categories);

    async function worker() {
      while (!cancelled) {
        const category = takeNext();
        if (!category) break;
        await fetchCategory(category);
      }
    }

    const workerCount = Math.min(concurrency, categories.length);
    if (workerCount > 0) {
      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    }
  }

  return { cancel, prioritize, run };
}
