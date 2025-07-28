# Local Testing: External Commons Config

This README provides instructions for testing the **"Explore In..."** feature without relying on the backend resources.

If you see a counsel error like `GET https://localhost/analysis/tools/external/config 502 (Bad Gateway)`, follow the below steps for local testing.

---

## 1. Create config and test files

### File: `config.json`

Create a file at: `/src/GuppyDataExplorer/ExplorerVisualization/config.json`

Then paste in the contents of the `/analysis/tools/external/config` API response. For example:

```
{
    "commons": [
        {
            "label": "Genomic Data Commons",
            "value": "gdc"
        },
        {
            "label": "Gabriella Miller Kids First",
            "value": "gmkf"
        }
    ],
    "commons_dict": {
        "gdc": "TARGET - GDC",
        "gmkf": "GMKF"
    }
}
```

In your `/src/GuppyDataExplorer/ExplorerVisualization/index.jsx` file, add the config import just below the imports

```
/** Static test config JSON for local development */
import configData from './config.json';
```

---

## 2a. Swap out the following logics:

### Fetch logic:

In your `/src/GuppyDataExplorer/ExplorerVisualization/index.jsx` file, update the `handleFetchExternalConfig()` function for local testing:

#### Replace this:

```
function handleFetchExternalConfig() {
  setIsLoadingExploreButton(true);
  fetchWithCreds({ path: '/analysis/tools/external/config' })
    .then(({ data }) => {
      setExternalConfig(data);
    })
    .catch(console.error)
    .finally(() => setIsLoadingExploreButton(false));
}
```

#### With this:

```
/** Test Data */
function handleFetchExternalConfig() {
    setIsLoadingExploreButton(true);
    Promise.resolve({ data: configData })
        .then(({ data }) => {
        setExternalConfig(data);
        })
        .catch(console.error)
        .finally(() => setIsLoadingExploreButton(false));
}
/** End test Data */
```

---

## 2b. Enable display  of explore button

In your `/src/GuppyDataExplorer/ExplorerVisualization/index.jsx` file, update the React output:

#### Replace this:

```
{patientIdsConfig?.export && (
<ExplorerExploreExternalButton
    filter={filter}
    selectedCommonsCounts={selectedCommonsCounts}
    externalConfig={externalConfig}
    isLoading={isLoadingExploreButton}
    setIsLoading={setIsLoadingExploreButton}
/>
)}
```

#### With this:

```
{/* Test Data */}
<ExplorerExploreExternalButton
    filter={filter}
    selectedCommonsCounts={selectedCommonsCounts}
    externalConfig={externalConfig}
    isLoading={isLoadingExploreButton}
    setIsLoading={setIsLoadingExploreButton}
/>
{/* End test Data */}
```

---

## 3. Setup local testing

Follow the steps outlined in this doc: https://pcdc.atlassian.net/wiki/x/AQAED

---

## 4. Avoid Committing Local Config

To avoid accidentally committing local testing files or logic:

* Search for `test data` and revert changes before committing.

---

## Summary

| Step | Action                                         |
| ---- | ---------------------------------------------- |
| 1    | Create config and test files.                  |
| 2    | Replace the logic for local testing.           |
| 3    | Setup local testing.                           |
| 4    | Don't commit changes from previous steps.      |
