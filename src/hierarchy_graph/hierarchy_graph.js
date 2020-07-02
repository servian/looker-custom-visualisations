import * as d3 from "d3";

looker.plugins.visualizations.add({
    create: function (element, config) {
        element.innerHTML = `
        <style>
        </style>`;

        this.hierarchySvg = d3.select("#vis")
            .append("svg")
    },

    // Render in response to the data or settings changing
    updateAsync: function (data, element, config, queryResponse, details, done) {
        this.clearErrors();

        const width = element.clientWidth;
        const height = element.clientHeight;

        const svg = this.hierarchySvg
            .html('')
            .attr('width', '100%')
            .attr('height', '100%')

        done();
    }
});
