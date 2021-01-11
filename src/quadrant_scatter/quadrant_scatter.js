import * as d3 from "d3";

function getExtent (supplied_min, supplied_max, data, accessor) {
    let data_extent = d3.extent(data, accessor)

    let new_min = supplied_min === undefined ? data_extent[0] : supplied_min
    let new_max = supplied_max === undefined ? data_extent[1] : supplied_max

    return [new_min, new_max]
}

function modifyOptions(vis, queryResponse, existingOptions) {
    const measureFields = queryResponse.fields.measure_like.map( element => {
        return {[element.label]: element.name}
    })

    const newOptions = {
        ... existingOptions,
        x_axis_field: {... existingOptions.x_axis_field, values: measureFields},
        y_axis_field: {... existingOptions.y_axis_field, values: measureFields},
    }

    vis.trigger('registerOptions', newOptions);
}

const visObject = {
    options: {
        x_axis_label: {
            order: 1,
            type: "string",
            label: "Label Text",
            default: "X Axis",
            section: "X Axis"
        },
        x_axis_field: {
            order: 2,
            display: "select",
            type: "string",
            label: "Value Field",
            section: "X Axis",
            values: []
        },
        x_axis_min: {
            order: 3,
            type: "number",
            display_size: "half",
            label: "Minimum Value",
            section: "X Axis",
            default: 0
        },
        x_axis_max: {
            order: 4,
            type: "number",
            display_size: "half",
            label: "Maximum Value",
            section: "X Axis"
        },
        y_axis_label: {
            order: 1,
            type: "string",
            label: "Label Text",
            default: "Y Axis",
            section: "Y Axis"
        },
        y_axis_field: {
            order: 2,
            display: "select",
            type: "string",
            label: "Value Field",
            section: "Y Axis",
            values: []
        },
        y_axis_min: {
            order: 3,
            type: "number",
            display_size: "half",
            label: "Minimum Value",
            section: "Y Axis",
            default: 0
        },
        y_axis_max: {
            order: 4,
            type: "number",
            display_size: "half",
            label: "Maximum Value",
            section: "Y Axis"
        },
        top_left_quad_label: {
            order: 1,
            display_size: "half",
            type: "string",
            label: "Top Left Label",
            default: "Top Left",
            section: "Quadrants"
        },
        top_right_quad_label: {
            order: 2,
            display_size: "half",
            type: "string",
            label: "Top Right Label",
            default: "Top Right",
            section: "Quadrants"
        },
        bottom_left_quad_label: {
            order: 3,
            display_size: "half",
            type: "string",
            label: "Bottom Left Label",
            default: "Bottom Left",
            section: "Quadrants"
        },
        bottom_right_quad_label: {
            order: 4,
            display_size: "half",
            type: "string",
            label: "Bottom Right Label",
            default: "Bottom Right",
            section: "Quadrants"
        }
    },

    create: function (element, config) {
        element.innerHTML = `
        <style>
            .axis path,
            .axis line {
                fill: none;
                stroke: #666666;
                stroke-width: 2px;
                shape-rendering: crispEdges;
            }

            .quadrant-label {
                fill: #a09e9f;
                font-family: 'Roboto', sans-serif;
                font-size: 24px;
                font-weight: bold;
            }

            .axis-label {
                fill: #666666;
                font-family: 'Roboto', sans-serif;
            }
        </style>
        <div id="quad_scatter_vis" style="width:100%; height: 100%"></div>`;
    },

    // Render in response to the data or settings changing
    updateAsync: function (data, element, config, queryResponse, details, done) {
        this.clearErrors();
        modifyOptions(this, queryResponse, this.options);

        const width = element.clientWidth;
        const height = element.clientHeight;

        const quadSvg = d3.select("#quad_scatter_vis")
            .html('')
            .append("svg")
                .attr('width', '100%')
                .attr('height', '100%')

        const margin = ({top: 20, right: 20, bottom: 20, left: 20})
        const x_extent = getExtent(config.x_axis_min, config.x_axis_max, data, d => d[config.x_axis_field].value)
        const y_extent = getExtent(config.y_axis_min, config.y_axis_max, data, d => d[config.y_axis_field].value)
        const x_axis_length = width - margin.right
        const y_axis_length = height - margin.bottom

        const x = d3.scaleLinear()
            .domain(x_extent)
            .range([margin.left, x_axis_length]);

        const y = d3.scaleLinear()
            .domain(y_extent)
            .range([y_axis_length, margin.top]);

        //quadrant labels
        const labels = [{
            text: config.bottom_left_quad_label,
            x: x_axis_length / 4,
            y: y_axis_length / 4 * 3
        }, {
            text: config.top_right_quad_label,
            x: x_axis_length / 4 * 3,
            y: y_axis_length / 4
        }, {
            text: config.bottom_right_quad_label,
            x: x_axis_length / 4 * 3,
            y: y_axis_length / 4 * 3
        }, {
            text: config.top_left_quad_label,
            x: x_axis_length / 4,
            y: y_axis_length / 4
        }]

        const xAxisLabel = config.x_axis_label
        const yAxisLabel = config.y_axis_label

        const xAxis = g => g
            .attr("transform", `translate(0,${y_axis_length})`)
            .call(d3.axisBottom(x).ticks([]).tickSize(0))
            .call(g => g.select(".domain").attr('stroke', '#666666'))

        const yAxis = g => g
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks([]).tickSize(0))
            .call(g => g.select(".domain").attr('stroke', '#666666'))

        quadSvg.append("g")
            .attr('id', 'axisX')
            .call(xAxis)

        quadSvg.append("g")
            .attr('id', 'axisY')
            .call(yAxis)

        quadSvg.selectAll(".quadrant-label")
            .data(labels)
            .enter()
            .append('text')
                .attr('class', 'quadrant-label')
                .attr('x', d => d.x)
                .attr('y', d => d.y)
                .attr('text-anchor', 'middle')
                .text(d => d.text);

        //x-axis label
        quadSvg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height - (margin.bottom / 5))
            .text(xAxisLabel);

        //y-axis label
        quadSvg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("dy", ".75em")
            .attr("transform", "translate(" + 0 + ", " + (height / 2 - margin.top) + ") rotate(-90)")
            .text(yAxisLabel);

        quadSvg.append("defs")
            .append('marker')
                .attr('id', 'marker_arrow')
                .attr('orient', 'auto')
                .attr('markerWidth', 10)
                .attr('markerHeight', 10)
                .attr('viewBox', '0 -5 10 10')
            .append('path')
                .attr('d', 'M 0,-3 L 0 3 L 7 0 Z')
                .attr('stroke', '#666666')
                .attr('stroke-width', 1)
                .attr('fill', '#666666');

        quadSvg.select('#axisX path.domain')
            .attr('marker-end', 'url(#marker_arrow)');
        quadSvg.select('#axisY path.domain')
            .attr('marker-end', 'url(#marker_arrow)');

        quadSvg.append('path')
            .attr('d', d3.line()([
                [x_axis_length / 2, margin.top],
                [x_axis_length / 2, y_axis_length]
                ])
            )
            .attr('stroke', '#666666')
            .attr('stroke-dasharray', '2')
            .attr('stroke-width', 1)
            .attr('fill', 'none')

        quadSvg.append("path")
            .attr('d', d3.line()([
                [margin.left, y_axis_length / 2],
                [x_axis_length, y_axis_length / 2]
            ]))
            .attr('stroke', '#666666')
            .attr('stroke-dasharray', '2')
            .attr('stroke-width', 1)
            .attr('fill', 'none')

        quadSvg.selectAll('circle')
            .data(data)
            .join('circle')
                .attr('cx', d => x(d[config.x_axis_field].value))
                .attr('cy', d => y(d[config.y_axis_field].value))
                .attr('r', 10)
                .attr('fill', '#5091c788')
                .attr('stroke', '#5091c7')

        done();
    }
}

looker.plugins.visualizations.add(visObject);
