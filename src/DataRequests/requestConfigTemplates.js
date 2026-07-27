// Keep the template source behind this service so a future API endpoint can
// replace the local JSON file without changing the selector UI.
export const REQUEST_CONFIG_TEMPLATES_PATH =
  process.env.NODE_ENV === 'development'
    ? 'https://localhost:9443/data/request_config/templates.json'
    : '/data/request_config/templates.json';

export async function fetchRequestConfigTemplates() {
  const response = await fetch(REQUEST_CONFIG_TEMPLATES_PATH);
  const data = response.ok ? await response.json() : null;

  if (!response.ok || !Array.isArray(data?.templates)) {
    throw new Error('Unable to load request configuration templates.');
  }

  return data.templates;
}
