import * as d3 from "d3";

function modifyOptions(vis, queryResponse, existingOptions) {
    const measureFields = queryResponse.fields.measure_like.map( element => {
        return {[element.label]: element.name}
    })
    // queryResponse.fields.dimension_like.forEach(element => {
    //     switch (element.type) {
    //         case 'date_time':
    //             timeDimensionFields.push({[element.label]: element.name});
    //             break;
    //         case 'string':
    //             latLongFields.push({[element.label]: element.name});
    //             break;
    //         case 'number':
    //             latLongFields.push({[element.label]: element.name});
    //             break;
    //         default:
    //             break;
    //     }
    // });

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

        const x_max = d3.max(data, d => d[config.x_axis_field].value)
        const y_max = d3.max(data, d => d[config.y_axis_field].value)

        const x = d3.scaleLinear()
            .domain([0, x_max])
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, y_max])
            .range([height - margin.bottom, margin.top]);

        //quadrant labels
        const labels = [{
            text: config.bottom_left_quad_label,
            x: x_max / 4,
            y: y_max / 4
        }, {
            text: config.top_right_quad_label,
            x: x_max / 4 * 3,
            y: y_max / 4 * 3
        }, {
            text: config.bottom_right_quad_label,
            x: x_max / 4 * 3,
            y: y_max / 4
        }, {
            text: config.top_left_quad_label,
            x: x_max / 4,
            y: y_max / 4 * 3
        }]

        const xAxisLabel = config.x_axis_label
        const yAxisLabel = config.y_axis_label

        const innerBorderY = [
            {x: x_max / 2, y: 0},
            {x: x_max / 2, y: y_max}
        ]

        const innerBorderX = [
            {x: 0, y: y_max / 2},
            {x: x_max, y: y_max / 2}
        ]

        const lineFunc = d3.line()
            .x(function (d) {
                return x(d.x);
            })
            .y(function (d) {
                return y(d.y);
            })
            .curve(d3.curveLinear);


        const xAxis = g => g
            .attr("transform", `translate(0,${height - margin.bottom})`)
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
                .attr('x', function (d) {
                    return x(d.x);
                })
                .attr('y', function (d) {
                    return y(d.y);
                })
                .attr('text-anchor', 'middle')
                .text(function (d) {
                    return d.text;
                });

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
            .attr('d', lineFunc(innerBorderY))
            .attr('stroke', '#666666')
            .attr('stroke-dasharray', '2')
            .attr('stroke-width', 1)
            .attr('fill', 'none')

        quadSvg.append("path")
            .attr('d', lineFunc(innerBorderX))
            .attr('stroke', '#666666')
            .attr('stroke-dasharray', '2')
            .attr('stroke-width', 1)
            .attr('fill', 'none')

        quadSvg.selectAll('circle')
            .data(data)
            .join('circle')
                .attr('cx', function (d) {
                    return x(d[config.x_axis_field].value);
                })
                .attr('cy', function (d) {
                    return y(d[config.y_axis_field].value);
                })
                .attr('r', 10)
                .attr('fill', '#5091c788')
                .attr('stroke', '#5091c7')

        done();
    }
}

looker.plugins.visualizations.add(visObject);
