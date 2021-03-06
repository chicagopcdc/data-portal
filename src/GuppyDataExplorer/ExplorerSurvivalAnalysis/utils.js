import './typedef';

/**
 * Get factor variables to use for survival analysis
 * @param {{ [key: string]: any }} aggsData
 * @param {{ field: string; name: string }[]} fieldMapping
 * @param {string[]} enumFilterList
 */
export const getFactors = (aggsData, fieldMapping, enumFilterList) => {
  const factors = [];
  const exceptions = ['project_id', 'data_contributor_id'];

  /** @type {{ [key: string]: string }} */
  const fieldNameMap = {};
  for (const { field, name } of fieldMapping) fieldNameMap[field] = name;

  const fields = Object.keys(aggsData);
  for (const field of fields)
    if (enumFilterList.includes(field) && !exceptions.includes(field))
      factors.push({
        label: fieldNameMap.hasOwnProperty(field)
          ? fieldNameMap[field]
          : field
              .toLowerCase()
              .replace(/_|\./gi, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase())
              .trim(),
        value: field,
      });

  return factors.sort((a, b) => {
    var labelA = a.label.toUpperCase();
    var labalB = b.label.toUpperCase();

    if (labelA < labalB) return -1;
    if (labelA > labalB) return 1;
    return 0;
  });
};

/**
 * Builds x-axis ticks array to use in plots
 * @param {{ data: { time: number; }[]}[]} data
 * @param {number} step
 */
export const getXAxisTicks = (data, step = 2) => {
  const times = data.flatMap(({ data }) => data).map(({ time }) => time);
  const minTime = Math.floor(Math.min(...times));
  const maxTime = Math.ceil(Math.max(...times));

  const ticks = [];
  for (let tick = minTime; tick <= maxTime; tick += step) ticks.push(tick);

  return ticks;
};

/**
 * Filter survival by start/end time
 * @param {SurvivalData[]} data
 * @param {number} startTime
 * @param {number} endTime
 * @returns {SurvivalData[]}
 */
export const filterSurvivalByTime = (data, startTime, endTime) =>
  data.map(({ data, name }) => ({
    data: data.filter(({ time }) => time >= startTime && time <= endTime),
    name,
  }));

/**
 * Filter risktable by start/end time
 * @param {RisktableData[]} data
 * @param {number} startTime
 * @param {number} endTime
 * @returns {RisktableData[]}
 */
export const filterRisktableByTime = (data, startTime, endTime) =>
  data.map(({ data, name }) => ({
    data: data.filter(({ time }) => time >= startTime && time <= endTime),
    name,
  }));
