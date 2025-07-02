# Portal Configurations

## The "portal config" file

Each Gen3 Commons has a JSON file which details what UI features should be deployed for a commons, and what the configuration for these features should be. This is commonly referred to as the "portal config" file. A "portal config" file usually locates at `/portal/gitops.json` in the manifest directory of a Commons. Portal also has some default config files under `/data/config` but most of them are legacy configurations.

Below is an example, with inline comments describing what each JSON block configures, as well as which properties are optional (i.e. commented as `// optional`) :

```jsonc
{
  // required if using Google Analytics
  "gaTrackingId": "xx-xxxxxxxxx-xxx",
  // start of query section - these attributes must be in the dictionary
  "graphql": {
    // graphQL fields to query for the homepage chart
    "boardCounts": [
      {
        // graphQL field name for aggregate count
        "graphql": "_case_count",
        // human readable name of field
        "name": "Case",
        // human readable plural name of field
        "plural": "Cases"
      },
      {
        "graphql": "_study_count",
        "name": "Study",
        "plural": "Studies"
      }
    ],
    "chartCounts": [
      {
        "graphql": "_case_count",
        "name": "Case"
      },
      {
        "graphql": "_study_count",
        "name": "Study"
      }
    ],
    // which JSON block above to use for displaying aggregate properties on the submission page (/submission)
    "projectDetails": "boardCounts"
  },
  "components": {
    // title of commons that appears on the homepage
    "appName": "Gen3 Generic Data Commons",
    // relates to the homepage (index page)
    "index": {
      // optional; text on homepage
      "introduction": {
        // optional; title of introduction
        "heading": "",
        // optional; text of homepage
        "text": "This is an example Gen3 Data Commons",
        // optional; link for button underneath the text
        "link": "/submission"
      },
      // optional; button “cards” displayed on the bottom of the homepage
      "buttons": [
        {
          // title of card
          "name": "Define Data Field",
          // name of icon to display on card located in /img/icons
          "icon": "planning",
          // card text
          "body": "Please study the dictionary before you start browsing.",
          // link for button
          "link": "/DD",
          // label for button
          "label": "Learn more"
        },
        {
          "name": "Explore Data",
          "icon": "explore",
          "body": "Explore data interactively.",
          "link": "/explorer",
          "label": "Explore data"
        }
      ],
      // optional; the charts on the homepage will be available to the public
      "homepageChartNodes": [
        {
          // GraphQL field name of node to show a chart for
          "node": "case",
          // plural human readable name of node
          "name": "Cases"
        },
        {
          "node": "study",
          "name": "Studies"
        }
      ]
    },
    // details what should be in the navigation bar
    "navigation": {
      // the buttons in the navigation bar
      "items": [
        {
          "link": "/DD", // button link
          "name": "Dictionary", // button label
          "icon": "dictionary", // icon from /img/icons for the button
          "color": "#a2a2a2" // icon hex color
        },
        {
          "icon": "exploration",
          "link": "/explorer",
          "color": "#a2a2a2",
          "name": "Exploration"
        },
        {
          "icon": "profile",
          "link": "/identity",
          "color": "#a2a2a2",
          "name": "Profile"
        }
      ]
    },
    // optional
    "topBar": {
      "items": [
        {
          "icon": "upload",
          "link": "/submission",
          "name": "Submit Data"
        },
        {
          "leftOrientation": true, // optional; puts the link on the left side of the top bar
          "link": "https://gen3.org/resources/user/",
          "name": "Documentation"
        }
      ],
      "menuItems": [
        {
          "icon": "external-link",
          "link": "https://path.to.privacy.policy",
          "name": "Privacy Policy"
        },
        {
          "icon": "external-link",
          "link": "https://path.to.terms.and.conditions",
          "name": "Terms & Conditions"
        }
      ]
    },
    // what to display on the login page (/login)
    "login": {
      // optional; title for the login page
      "title": "Gen3 Generic Data Commons",
      // optional; subtitle for login page
      "subTitle": "Explore, Analyze, and Share Data",
      // optional; text on the login page
      "text": "This is a generic Gen3 data commons.",
      // optional; text for the contact section of the login page
      "contact": "If you have any questions about access or the registration process, please contact ",
      // optional; email for contact
      "email": "support@datacommons.io"
    },
    // see docs/multi_tab_explorer.md for more information
    "explorerConfig": [],
    // optional; logos to be displayed in the footer, usually sponsors
    "footerLogos": [
      {
        // src path for the image
        "src": "/src/img/gen3.png",
        // link for image
        "href": "https://ctds.uchicago.edu/gen3",
        // alternate text if image won’t load
        "alt": "Gen3 Data Commons"
      },
      {
        "src": "/src/img/createdby.png",
        "href": "https://ctds.uchicago.edu/",
        "alt": "Center for Translational Data Science at the University of Chicago"
      }
    ],
    // optional; colors for the graphs both on the homepage and on the explorer page (will be used in order)
    "categorical9Colors": [
      "#c02f42",
      "#175676",
      "#59CD90",
      "#F2DC5D",
      "#40476D",
      "#FFA630",
      "#AE8799",
      "#1A535C",
      "#462255"
    ],
    // optional; colors for the graphs when there are only 2 colors (bar and pie graphs usually)
    "categorical2Colors": ["#6d6e70", "#c02f42"]
  },
  // optional; do users need to take a quiz or agree to something before they can access the site?
  "requiredCerts": [],
  // optional; will hide certain parts of the site if needed
  "featureFlags": {},
  // optional; set false to not list fence project access on profile page
  "showFenceAuthzOnProfile": true,
  // optional; configure some parts of arborist UI
  "componentToResourceMapping": {
    // name of component as defined in this file
    "Workspace": {
      // ABAC fields defining permissions required to see this component
      "resource": "/workspace",
      "method": "access",
      "service": "jupyterhub"
    },
    "Analyze Data": {
      "resource": "/workspace",
      "method": "access",
      "service": "jupyterhub"
    },
    "Query": {
      "resource": "/query_page",
      "method": "access",
      "service": "query_page"
    },
    "Query Data": {
      "resource": "/query_page",
      "method": "access",
      "service": "query_page"
    }
  }
}
```

If you are looking to copy/paste configuration as a start, please use something in the Github repo as the inline comments below will become an issue.

See [this page](./multi_tab_explorer.md) for further information on `explorerConfig` configuration option.

## Configuring units for range filters in pcdc.json 

Information in `pcdc.json` allows the configuration of the filters in the explorer. 

Range filters (filters with a min and max) can be configured according to their specific context. For example, age filters like 'Age at Censor Status' is configured to contain a Unit Calculator (which converts months/years to days) while numerical filters like 'Year at Initial Diagnoses' don't have a Unit Calculator. Currently, all Unit Calculators convert months/years to days.

All configurations can be adjusted in `pcdc.json`, in "filters"->"unitCalcConfig". "unitCalcConfig"->"calculatorMapping" separates filters into "number" filters and "age" filters, such that all "age" filters render a Unit Calculator, while "number" filters don't. "unitCalcConfig" -> "ageUnits" allow changes to the `quantity`, `desiredUnit`, and `selectUnits` that are used in the Unit Calculator itself.

The current configuration in `pcdc.json is:
```
  ...
  "unitCalcConfig": {
      "ageUnits": {
          "quantity": "age",
          "desiredUnit": "days",
          "selectUnits": { "months": 30, "years": 365 }
        },
      "calculatorMapping": {
          "number": [
            "Year at Initial Diagnosis",
            "Longest Diameter Dimension 1",
            "Radiation Dose",
            "Necrosis PCT",
            "MRD Result Numeric"
          ],
          "age": [
            "Age At Censor Status",
            "Age at Tumor Assessment",
            "Age at Molecular Analysis",
            "Age at SMN"
          ]
        }
      }
```

For example, to add another range filter called "Year of birth" as a numerical range filter (one without a Unit Calculator), we append "Year of birth" as another element in the list "unitCalcConfig"-> "calculatorMapping" -> "number". 

This setup is currently not able to accommodate any other age units apart from `ageUnits`. 

### To add further configurations 

The information in `ageUnits` and `calculatorMapping` is imported in `src/gen3-ui-component/components/filters/FilterGroup/index.jsx` as `unitCalcTitles` (filterConfig.unitCalcConfig.calculatorMapping) and `unitCalcConfig` (filterConfig.unitCalcConfig.ageUnits). They can then be used to configure the filters accordingly, and be passed down as props to other files. 

For example, `unitCalcConfig` is passed as a prop from `~FilterGroup/index.jsx` to `~/FilterSection/index.jsx`, and used in `~/RangeFilter/index.jsx` and `~RangeFilter/UnitCalculator/UnitCalculator.jsx`. 



