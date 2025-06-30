## request format

/v0/tools/tableone
`{
    "filterSets": [
        {
            "filter": {"AND":[{"IN":{"sex":["Male"]}},{"IN":{"consortium":["INTERACT"]}}]},
            "id": 1,
            "name": "all-Male",
            "explorerId": 1
        }
    ],
    "covariates": {
        "lkss": {
            "type": "categorical",
            "label": "survival_characteristics.lkss_obfuscated",
            "selectedKeys": ["Alive", "Dead", "Unknown"]
        },
        "Race": {
            "type": "categorical",
            "label": "race",
            "selectedKeys": ["Asian"]
        },
        "Year At Disease Phase": {
            "label": "year_at_disease_phase",
            "type": "continuous"
        }
    }
}`
