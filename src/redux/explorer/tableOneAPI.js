import { fetchWithCreds } from '../utils.fetch';
import { isTableOneEnabled } from './utils';

/** @typedef {import('./types').ExplorerState} ExplorerState */

/** @returns {Promise<ExplorerState['config']['tableOneConfig']>} */
export function fetchTableOneConfig() {
  return fetchWithCreds({
    path: '/analysis/tools/tableone/config',
    method: 'GET',
  }).then(({ response, data, status }) => {
    if (status !== 200) throw response.statusText;
    return { ...data, enabled: isTableOneEnabled(data) };
  });
}

/**
 * @returns {Promise<ExplorerState['tableOneResult']>}
 */
export function fetchTableOneResult(body) {
  return fetchWithCreds({
    path: '/analysis/tools/tableone',
    method: 'POST',
    body: JSON.stringify(body),
  }).then(({ response, data, status }) => {
    if (status !== 200) {
      throw response.statusText;
    }
    return data;
  });
}
