# Local Testing: External Commons Config

This README provides instructions for testing the **"Explore In..."** feature without relying on the backend resources.

---

## 1. Create config and test files

### File: `config.json`

Create a file at: `src/GuppyDataExplorer/ExplorerExploreExternalButton/config.json`

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
````

---

## 2a. Swap out the following logics:

### Fetch logic:

In your `ExplorerExploreExternalButton.jsx` file, update the `handleFetchExternalConfig()` function for local testing:

#### Replace this:

```
function handleFetchExternalConfig() {
  setIsLoading(true);
  fetchWithCreds({ path: '/analysis/tools/external/config' })
    .then(({ data }) => {
      setExternalConfig(data);
    })
    .catch(console.error)
    .finally(() => setIsLoading(false));
}
```

#### With this:

```
/** Test Data */
function handleFetchExternalConfig() {
    setIsLoading(true);
    Promise.resolve({ data: configData })
        .then(({ data }) => {
        setExternalConfig(data);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
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
    />
)}
```

#### With this:

```
{/* Test Data */}
<ExplorerExploreExternalButton
    filter={filter}
    selectedCommonsCounts={selectedCommonsCounts}
/>
{/* End test Data */}
```

---

## 3. Setup local testing

In your `/src/GuppyDataExplorer/ExplorerVisualization/index.jsx` file, update the const `selectedCommonsCounts`:

#### Replace this:

```
const resourceNames = ['TARGET - GDC', 'GMKF']; // Add more commons as available

  const selectedCommonsCounts = resourceNames.map((name) => {
    const bucket = externalResourceData.find(b => b.key === name);
    return {
      resourceName: name,
      count: bucket ? bucket.count : 0,
    };
  });
```

#### With this:

```
{/* Test Data */}
const gdcCount = 0;
const gmkfCount = 0;

const selectedCommonsCounts = [
    { resourceName: 'TARGET - GDC', count: gdcCount },
    { resourceName: 'GMKF', count: gmkfCount },
];
{/* End test Data */}
```

Thenn simply adjust the count and see the explore button respond locally.

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
