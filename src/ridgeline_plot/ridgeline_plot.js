import * as d3 from "d3";
import * as d3_array from "d3-array";

const options = {
};

function parseData(data, config) {
    const groupedData = d3_array.group(data, d => d['customer_segments_labels.centroid_id'].value);
    // return Array.from(groupedData, ([key, value]) => ({'dimension': key, 'dataPoints': value}));
    return groupedData;
}

const margin = { top: 60, right: 30, bottom: 20, left: 110 },
    width = 1000 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

looker.plugins.visualizations.add({
    options: options,
    create: function (element, config) {
        element.innerHTML = `
        <style>
        </style>`;

        this.quadSvg = d3.select("#vis")
            .append("div")
    },

    // Render in response to the data or settings changing
    updateAsync: function (data, element, config, queryResponse, details, done) {
        this.clearErrors();
        // append the svg object to the body of the page

        var svg = this.quadSvg
            .html('')
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                "translate(" + margin.left + "," + margin.top + ")");

        const [scaleMin, scaleMax] = d3.extent(data, d => d['customer_segments_labels.visit_duration'].value);
        const parsedData = parseData(data, config);
        const columns = Array.from(parsedData.keys());

        // Get the different categories and count them
        var categories = columns
        var n = categories.length

        // Add X axis
        var x = d3.scaleLinear()
            .domain([scaleMin, scaleMax])
            .range([0, width]);

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        // Create a Y scale for densities
        var y = d3.scaleLinear()
            .domain([0, 0.006])
            .range([height, 0]);

        // Create the Y axis for names
        var yName = d3.scaleBand()
            .domain(categories)
            .range([0, height])
            .paddingInner(1)
        svg.append("g")
            .call(d3.axisLeft(yName));

        // Compute kernel density estimation for each column:
        var kde = kernelDensityEstimator(kernelEpanechnikov(8), x.ticks(200)) // increase this 40 for more accurate density.
        var allDensity = []
        for (var i = 0; i < n; i++) {
            var key = categories[i]
            // var density = kde(parsedData.get(key).map(function (d) { return d; }))
            var density = kde(parsedData.get(key).map(function (d) { return d['customer_segments_labels.count'].value * d['customer_segments_labels.visit_duration'].value; }))
            allDensity.push({ key: key, density: density })
        }

        console.log(allDensity);
        // console.log(parsedData);

        // Add areas
        svg.selectAll("areas")
            .data(allDensity)
            .enter()
            .append("path")
            .attr("transform", function (d) { return ("translate(0," + (yName(d.key) - height) + ")") })
            .datum(function (d) { return (d.density) })
            .attr("fill", "#69b3a2")
            .attr("stroke", "#000")
            .attr("stroke-width", 1)
            .attr("d", d3.line()
                .curve(d3.curveBasis)
                .x(function (d) { return x(d[0]); })
                .y(function (d) { return y(d[1]); })
            )


        // This is what I need to compute kernel density estimation
        function kernelDensityEstimator(kernel, X) {
            return function (V) {
                return X.map(function (x) {
                    return [x, d3.mean(V, function (v) { return kernel(x - v); })];
                });
            };
        }
        function kernelEpanechnikov(k) {
            return function (v) {
                return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
            };
        }

        // const width = element.clientWidth;
        // const height = element.clientHeight;

        done();
    }
});
