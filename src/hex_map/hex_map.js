import * as d3 from "d3";
import * as topojson from "topojson-client";
import * as d3q from "d3-queue";
import * as d3hex from "d3-hexbin";

var projection = d3.geoMercator();

function ready(error, topology, cleanedData, vis) {
    if (error) throw error;
    const visObject = vis.visObject
    const element = vis.element
    visObject.mapSvg.html('');
    visObject.sliderSvg.html('');

    const width = element.clientWidth;
    const height = element.clientHeight;

    const sliderWidth = width
    const sliderHeight = 45;
    const sliderMargin = {
        top: 10,
        bottom: 0,
        left: 40,
        right: 40
    };

    visObject.mapSvg.attr("height", height)
        .attr("width", width)

    visObject.sliderSvg.attr("height", sliderHeight)
        .attr("width", sliderWidth)

    let hexGroup = visObject.mapSvg.append("g").attr("id", "hex_group");
    let sliderGroup = visObject.sliderSvg.append("g").attr("id", "slider_group");
    let axisGroup = sliderGroup.append('g').attr("id", "axis-group");
    let brushGroup = sliderGroup.append('g').attr("id", "brush_group").attr("transform", 'translate(0,0)');

    let geojson = topojson.feature(topology, topology.objects.football_field);
    projection.fitExtent([[40, 10], [element.clientWidth, element.clientHeight]], geojson);

    let path = d3.geoPath()
        .projection(projection);

    // Draw the map
    const mapGroup = visObject.mapSvg.append("g").attr("id", "map_group");
    const mapPath = mapGroup.append("path").attr("class", "topology");
    mapPath.datum(geojson)
        .join("path")
        .attr("d", path);

    // Draw Slider
    let timeScale = d3.scaleTime()
        .domain(d3.extent(cleanedData, d => d.start_timestamp))
        .range([0, sliderWidth - sliderMargin.left - sliderMargin.right])
        .nice()
        .clamp(true);

    visObject.sliderSvg.attr("width", sliderWidth)
        .attr("height", sliderHeight);

    let brushResizePath = function (d) {
        let e = +(d.type === "e"),
            x = e ? 1 : -1,
            y = (sliderHeight - sliderMargin.top - sliderMargin.bottom) / 2;
        return "M" + (.5 * x) + "," + y
            + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
            + "V" + (2 * y - 6)
            + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
            + "Z"
            + "M" + (2.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8)
            + "M" + (4.5 * x) + "," + (y + 8)
            + "V" + (2 * y - 8);
    };

    sliderGroup.attr("transform", 'translate(' + sliderMargin.left + ',' + sliderMargin.top + ')');

    var brush = d3.brushX()
        .extent([[0, 0], [sliderWidth - sliderMargin.left - sliderMargin.right, sliderHeight - sliderMargin.top - sliderMargin.bottom]])
        .on("brush", brushMoved)
        .on("end", brushMoved);

    axisGroup.call(d3.axisBottom(timeScale).ticks(sliderWidth / 70));
    // .attr("transform", 'translate('+[0,10]+')')

    let handle = brushGroup.selectAll(".handle--custom")
        .data([{type: "w"}, {type: "e"}])
        .join("path")
        .attr("class", "handle--custom")
        .attr("stroke", "#000")
        .attr("fill", '#eee')
        .attr("cursor", "ew-resize")
        .attr("d", brushResizePath);

    brushGroup
        .call(brush)
        .call(brush.move, [0, 50])
        .select(".selection")
        .attr('fill', "#ffb84d");

    function brushMoved() {
        console.log("brushing")
        let selection = d3.event.selection

        const hexbin = d3hex.hexbin()
            .extent([[10, 10], [width, height]])
            .radius(6)
            .x(d => d.pickup_x)
            .y(d => d.pickup_y);

        if (selection) {
            // Update the location of the slider handles
            handle.attr("display", null)
                .attr("transform", function (d, i) {
                    return "translate(" + [selection[i], -2] + ")";
                });
            const range = selection.map(timeScale.invert);
            updateHexbin(hexbin, hexGroup, cleanedData.filter(function (d) {
                return range[0] <= d.start_timestamp && range[1] >= d.start_timestamp;
            }));
        } else {
            handle.attr("display", "none");
        }
    }
}

function updateHexbin(hexbin, hexGroup, data) {
    let hexbinData = hexbin(data);
    let maxMetric = d3.max(hexbinData, function (d) {
        return d3.sum(d, function (e) {
            return e.metric;
        });
    });

    // The colour scale is relative to the min and max values
    // of the sliders' current window and not the entire dataset.
    // That's why the scale is recreated every time the slider is 
    // udpated.
    const colour = d3.scaleLinear()
        .domain([0, maxMetric / 2, maxMetric])
        .range(['#FDEDEC', '#E74C3C', '#78281F']);

    hexGroup.selectAll("path")
        .data(hexbinData)
        .join("path")
        .attr("d", function (d) {
            return hexbin.hexagon();
        })
        .attr("transform", function (d) {
            return "translate(" + d.x + "," + d.y + ")";
        })
        .attr("stroke", "#FFF")
        .attr("fill", function (d) {
            // Return the sum of the metric value passed through the colour scale function.
            return colour(d3.sum(d, function (e) {
                return e.metric;
            }));
        });
}

/*
Clean and verify the data from the data table and 
convert lat/long to x/y based on the projection provided 
*/
function cleanData(data, projection, config, callback) {
    let cleaned = [];
    data.forEach(element => {
        let p = projection([element[config.longitude].value, element[config.latitude].value]);
        cleaned.push(
            {
                "pickup_x": p[0],
                "pickup_y": p[1],
                "start_timestamp": d3.isoParse(element[config.timeDimension].value),
                "pickup_long": element[config.longitude].value,
                "pickup_lat": element[config.latitude].value,
                "metric": +element[config.measure].value
            }
        );
    });
    callback(null, cleaned);
    // return cleaned;
}

function hexColourScale(min, max) {
}

var options = {
    topoJson: {
        order: 1,
        display: "text",
        type: "string",
        label: "Topojson URL",
        section: "Map"
    },
    timeDimension: {
        order: 1,
        display: "select",
        type: "string",
        label: "Time column",
        section: "Field Selection"
        // {"Select fields...": "select_field"}
        // ]
    },
    latitude: {
        order: 2,
        display: "select",
        type: "string",
        label: "Latitude column",
        section: "Field Selection"
    },
    longitude: {
        order: 3,
        display: "select",
        type: "string",
        label: "Longitude column",
        section: "Field Selection"
    },
    measure: {
        order: 4,
        display: "select",
        type: "string",
        label: "Measure column",
        section: "Field Selection"
    }
};

function modifyOptions(vis, queryResponse, existingOptions) {
    let latLongFields = [];
    let timeDimensionFields = [];
    let measureFields = [];

    queryResponse.fields.dimension_like.forEach(element => {
        switch (element.type) {
            case 'date_time':
                timeDimensionFields.push({[element.label]: element.name});
                break;
            case 'string':
                latLongFields.push({[element.label]: element.name});
                break;
            case 'number':
                latLongFields.push({[element.label]: element.name});
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
    newOptions["latitude"].values = latLongFields;
    newOptions["longitude"].values = latLongFields;
    newOptions["measure"].values = measureFields;

    vis.trigger('registerOptions', newOptions);
}

function validateDataAndConfig(vis, queryResponse, config) {
    if (queryResponse.fields.measure_like.length < 1) {
        vis.addError({title: "No Measures", message: "This visualisation requires a measure"});
        return false;
    }
    if (queryResponse.fields.dimension_like.length < 3) {
        vis.addError({title: "No Dimensions", message: "This visualisation requires 3 dimensions"});
        return false;
    }
    return true;
}

function readMapJson(mapUrl, callback) {
    d3.json(mapUrl).then(function (topology) {
        callback(null, topology);
    })
        .catch(function (error) {
            callback(error, null);
        });
}

looker.plugins.visualizations.add({
    options: options,
    create: function (element, config) {
        element.innerHTML = `
        <style>
            path.topology {
            fill: transparent;
            stroke: #000;
            stroke-width: .5px;
            }
        </style>`;

        this.mapSvg = d3.select("#vis")
            .append("svg")
        // .attr("width", "100%")
        // .attr("height", "100%")

        this.sliderSvg = d3.select("#vis")
            .append("svg")
            // .attr("width", "100%")
            // .attr("height", "47")
            .attr("id", "slider")

    },
    // Render in response to the data or settings changing
    updateAsync: function (data, element, config, queryResponse, details, done) {
        const visObject = this
        visObject.clearErrors();
        modifyOptions(this, queryResponse, options);
        if (!validateDataAndConfig(this, queryResponse, config)) {
            return;
        }


        d3q.queue()
            .defer(readMapJson, config.topoJson)
            .defer(cleanData, data, projection, config)
            // Send the "this" and "element" objects through to the "ready" function
            // So that we have access to the visualisation's stuff
            // .defer((element, that, callback) => callback(null, {"element": element, "visObject": that}), element, this)
            // .await(ready);
            .await(function(error, topology, cleanedData) {
                ready(error, topology, cleanedData, {"element": element, "visObject": visObject})
            });

        done();
    }
});
