import * as d3 from "d3";
import * as topojson from "topojson-client";
import * as d3q from "d3-queue";
import * as d3hex from "d3-hexbin";
import * as utils from "./utils"
import {validateDataAndConfig} from "./utils";

var projection = d3.geoMercator();

function ready(error, topology, cleanedData, vis) {
    if (error) throw error;
    const visObject = vis.visObject
    const element = vis.element
    visObject.mapSvg.html('');
    visObject.sliderSvg.html('');

    const width = element.clientWidth;
    const height = element.clientHeight - 50;

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

    axisGroup.call(d3.axisBottom(timeScale));
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
        let selection = d3.event.selection

        const hexbin = d3hex.hexbin()
            .extent([[10, 10], [width, height]])
            .radius(5)
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
    if (data.length > 0) {
        let hexbinData = hexbin(data);
        let maxMetric = d3.max(hexbinData, function (d) {
            return d3.sum(d, function (e) {
                return e.metric;
            });
        });

        // The colour scale is relative to the min and max values
        // of the sliders' current window and not the entire dataset.
        // That's why the scale is recreated every time the slider is
        // updated.
        const colour = d3.scaleLinear()
            .domain([0, maxMetric / 2, maxMetric])
            // .range(['#FDEDEC', '#E74C3C', '#195d00']);
            .range(['#2d940f', '#ef982e', '#ea453c',]);

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
    },
    location: {
        order: 2,
        display: "select",
        type: "string",
        label: "Location Column",
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

        let errors = validateDataAndConfig(queryResponse, config)
        if (errors.length > 0) {
            errors.forEach(err => {
                    visObject.addError({title: err.title, message: err.message});
                }
            )
            return;
        }

        // Update options now that fields are in the Look
        let newOptions = utils.updateOptions(queryResponse, options);
        this.trigger('registerOptions', newOptions);

        d3q.queue()
            .defer(utils.readUrlData, config.topoJson)
            .defer(utils.cleanData, data, projection, config)
            // Send the "this" and "element" objects through to the "ready" function
            // So that we have access to the visualisation's stuff
            // .defer((element, that, callback) => callback(null, {"element": element, "visObject": that}), element, this)
            // .await(ready);
            .await(function (error, topology, cleanedData) {
                ready(error, topology, cleanedData, {"element": element, "visObject": visObject})
            });

        done();
    }
});
