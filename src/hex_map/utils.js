import * as d3 from "d3";

/*
Clean and verify the data from the data table and
convert lat/long to x/y based on the projection provided
*/
export function cleanData(data, config, callback) {
    let cleaned = [];
    data.forEach(element => {
        cleaned.push(
            {
                "timestamp": d3.isoParse(element[config.timeDimension].value),
                "longitude": element[config.location].value[1],
                "latitude": element[config.location].value[0],
                "metric": +element[config.measure].value
            }
        );
    });
    callback(null, cleaned);
    // return cleaned;
}

export function readUrlData(mapUrl, callback) {
    d3.json(mapUrl).then(function (topology) {
        callback(null, topology);
    })
        .catch(function (error) {
            callback(error, null);
        });
}

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
