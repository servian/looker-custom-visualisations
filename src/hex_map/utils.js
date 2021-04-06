import * as d3 from "d3";

/*
Clean and verify the data from the data table
*/
export function cleanData(data, config, callback) {
    let getOrNull = (val) => (typeof val === 'undefined') ? null : val.value;
    let cleaned = [];
    data.forEach(element => {
        let timestamp = getOrNull(element[config.timeDimension])
        let location = getOrNull(element[config.location])
        let metric = getOrNull(element[config.measure])

        if (timestamp != null && location != null && metric != null) {
            cleaned.push(
                {
                    "timestamp": d3.isoParse(timestamp),
                    "longitude": location[1],
                    "latitude": location[0],
                    "metric": +metric
                }
            );
        }
    });
    callback(null, cleaned);
}

export function readUrlData(mapUrl, callback) {
    d3.json(mapUrl).then(function (topology) {
        callback(null, topology);
    }).catch(function (error) {
        callback(error, null);
    });
}

// TODO: Do a better job of validating data
// TODO: Validate configuration
export function validateDataAndConfig(queryResponse, config) {
    let errors = []

    if (queryResponse.fields.measure_like.length < 1) {
        errors.push({title: "Invalid Fields Selected", message: "This visualisation requires a measure"})
    }
    if (queryResponse.fields.dimension_like.length < 2) {
        errors.push({title: "Invalid Fields Selected", message: "This visualisation requires 2 dimensions"})
    }
    return errors;
}

// TODO: Make this more generic
export function updateOptions(queryResponse, existingOptions) {
    let locationFields = [];
    let timeDimensionFields = [];
    let measureFields = [];

    queryResponse.fields.dimension_like.forEach(element => {
        switch (element.type) {
            case 'date_time':
                timeDimensionFields.push({[element.label]: element.name});
                break;
            case 'date_date':
                timeDimensionFields.push({[element.label]: element.name});
                break;
            case 'location':
                locationFields.push({[element.label]: element.name});
                break;
            default:
                break;
        }
    });

    queryResponse.fields.measure_like.forEach(element => {
        measureFields.push({[element.label]: element.name});
    });

    let newOptions = {...existingOptions};
    newOptions["timeDimension"].values = timeDimensionFields;
    newOptions["location"].values = locationFields;
    newOptions["measure"].values = measureFields;

    return newOptions
}
