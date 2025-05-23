// filepath: /path/to/src/node-exports.js
// Import just getGQLFilter from its source file, not the whole app
import { getGQLFilter } from './GuppyComponents/Utils/queries.js';

// Export only what's needed for Node usage
module.exports = { getGQLFilter };