import * as d3q from "d3-queue";
import * as utils from "./utils"
import {HexMap} from "./hexmap";

function ready(error, topologyData, cleanedData, vis) {
    if (error) throw error;
    const element = vis.element

    const mapProps = {
        width: element.clientWidth,
        height: element.clientHeight - 50
    }
    const sliderProps = {
        width: element.clientWidth,
        height: 45,
        top: 10,
        bottom: 0,
        left: 40,
        right: 40
    };

    const hexMap = new HexMap(mapProps, sliderProps, topologyData, cleanedData, element)
    hexMap.clear()
    hexMap.renderMap("london_geo")
    hexMap.renderSlider()
}

var options = {
    topoJson: {
        order: 1,
        display: "text",
        type: "string",
        label: "Topojson URL",
        section: "Map Config"
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
    },
    hex_size: {
        order: 4,
        type: "number",
        label: "Hexagon Size",
        section: "Map Config",
        display_size: "half"
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
    },

    // Render in response to the data or settings changing
    updateAsync: function (data, element, config, queryResponse, details, done) {
        const visObject = this
        visObject.clearErrors();

        let errors = utils.validateDataAndConfig(queryResponse, config)
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
            .defer(utils.cleanData, data, config)
            // Send the "this" and "element" objects through to the "ready" function
            // So that we have access to the visualisation's stuff
            .await(function (error, topology, cleanedData) {
                ready(error, topology, cleanedData, {"element": element, "visObject": visObject})
            });

        done();
    }
});
