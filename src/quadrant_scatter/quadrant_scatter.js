import * as d3 from "d3";

looker.plugins.visualizations.add({
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
                font-size: 24px;
                font-weight: bold;
            }

            .axis-label {
                fill: #666666;
                font-family: 'Roboto', sans-serif;
                font-size: 2
            }
        </style>`;

        this.quadSvg = d3.select("#vis")
            .append("svg")
    },

    // Render in response to the data or settings changing
    updateAsync: function (data, element, config, queryResponse, details, done) {
        this.clearErrors();
        console.log("updating")

        const width = element.clientWidth;
        const height = element.clientHeight;

        const svg = this.quadSvg
            .html('')
            .attr('width', '100%')
            .attr('height', '100%')

        const margin = ({ top: 20, right: 20, bottom: 20, left: 20 })

        const x_max = 10;
        const y_max = 10;

        const x = d3.scaleLinear()
            .domain([0, x_max])
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, y_max])
            .range([height - margin.bottom, margin.top]);

        //quadrant labels
        const labels = [{
            text: 'Young',
            x: x_max / 4,
            y: y_max / 4
        }, {
            text: 'Advanced Capability',
            x: x_max / 4 * 3,
            y: x_max / 4 * 3
        }, {
            text: 'Question Mark',
            x: x_max / 4 * 3,
            y: y_max / 4
        }, {
            text: 'Rising Star',
            x: x_max / 4,
            y: y_max / 4 * 3
        }]

        const xAxisLabel = 'ProductionML Readiness';
        const yAxisLabel = 'Ability to Deliver Business Value'

        const innerBorderY = [
            { x: x_max / 2, y: 0 },
            { x: x_max / 2, y: y_max }
        ]

        const innerBorderX = [
            { x: 0, y: y_max / 2 },
            { x: x_max, y: y_max / 2 }
        ]

        const lineFunc = d3.line()
            .x(function (d) { return x(d.x); })
            .y(function (d) { return y(d.y); })
            .curve(d3.curveLinear);


        const xAxis = g => g
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks([]).tickSize(0))
            .call(g => g.select(".domain").attr('stroke', '#666666'))

        const yAxis = g => g
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks([]).tickSize(0))
            .call(g => g.select(".domain").attr('stroke', '#666666'))

        this.quadSvg.append("g")
            .attr('id', 'axisX')
            .call(xAxis)

        this.quadSvg.append("g")
            .attr('id', 'axisY')
            .call(yAxis)

        this.quadSvg.selectAll(".quadrant-label")
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
        this.quadSvg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("x", width / 2)
            .attr("y", height)
            .text(xAxisLabel);

        //y-axis label
        this.quadSvg.append("text")
            .attr("class", "axis-label")
            .attr("text-anchor", "middle")
            .attr("dy", ".75em")
            .attr("transform", "translate(" + 0 + ", " + (height / 2 - margin.top) + ") rotate(-90)")
            .text(yAxisLabel);

        this.quadSvg.append("defs")
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

        this.quadSvg.select('#axisX path.domain')
            .attr('marker-end', 'url(#marker_arrow)');
        this.quadSvg.select('#axisY path.domain')
            .attr('marker-end', 'url(#marker_arrow)');

        this.quadSvg.append('path')
            .attr('d', lineFunc(innerBorderY))
            .attr('stroke', '#666666')
            .attr('stroke-dasharray', '2')
            .attr('stroke-width', 1)
            .attr('fill', 'none')

        this.quadSvg.append("path")
            .attr('d', lineFunc(innerBorderX))
            .attr('stroke', '#666666')
            .attr('stroke-dasharray', '2')
            .attr('stroke-width', 1)
            .attr('fill', 'none')

        this.quadSvg.selectAll('circle')
            .data(data)
            .join('circle')
            .attr('cx', function (d) {
                return x(d["ml_maturity_assessment.ability_to_deliver_business_value"].value);
            })
            .attr('cy', function (d) {
                return y(d["ml_maturity_assessment.production_ml_readiness"].value);
            })
            .attr('r', 10)
            .attr('fill', '#5091c788')
            .attr('stroke', '#5091c7')

        done();
    }
});
