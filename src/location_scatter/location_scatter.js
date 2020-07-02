import { select, scaleLinear, format, nest, map } from "d3";
import { geoMercator, geoPath } from "d3-geo";
import { sliderBottom } from "d3-simple-slider";

looker.plugins.visualizations.add({
    create: function (element, config) {

        this.timeSlider = select('#vis').append("svg").attr("id", "time-slider")
        this.scatterChart = select('#vis').append("svg").attr("id", "scatter-chart")

        this.updateScatter = function (svgCanvas, inputForPlayerMap) {
            svgCanvas.selectAll("circle")
                .data(inputForPlayerMap, function (d) { return d.playerId })
                .join("circle")
                .attr("r", function (d) {
                    if (d.inPossession > 0) {
                        return 10
                    } else {
                        return 5
                    }
                })
                .attr("cx", function (d) { return d.x })
                .attr("cy", function (d) { return d.y })
                .attr("fill", function (d) {
                    if (d.inPossession > 0) {
                        return "yellow";
                    } else {
                        if (d.teamIndex == 1) {
                            return "#cc0000"
                        } else {
                            return "#003399"
                        }
                    }

                })

                .attr("fill-opacity", function (d) { return (d.role == "na") ? .2 : 1 })
                .attr("stroke-width", "1")
        }
    },

    updateAsync: function (data, element, config, queryResponse, details, done) {
        this.clearErrors();
        console.log(data);

        const sliderMargin = { top: 15, right: 40, left: 15 }
        const sliderWidth = element.clientWidth - sliderMargin.left - sliderMargin.right
        const sliderHeight = 70;
        const scatterWidth = element.clientWidth;
        const scatterHeight = element.clientHeight - sliderHeight;

        const _timeSlider = this.timeSlider
            .html('')
            .attr('width', '100%')
            .attr('height', sliderHeight)
            .append('g')
            .attr("transform", "translate(" + sliderMargin.left + "," + sliderMargin.top + ")")

        const _chartSvg = this.scatterChart
            .html('')
            .attr("width", scatterWidth)
            .attr("height", scatterHeight)
            .append("g")

        _chartSvg.append('g')
            .attr("id", "field-outline")

        _chartSvg.append("g")
            .attr("id", "field-markings")

        const _slider = sliderBottom()
            .min(0)
            .max(1)
            .tickFormat(format('.2%'))
            .width(sliderWidth);


        var timePeriods = nest().key(d => { return d['experiment8_field.rounded_seconds'].value }).entries(data);
        var teamIndex = map(data, function (d) { return d['experiment8_field.team_name'].value }).keys()
        // Ensure the data is always sorted by the time dimension
        timePeriods.sort((a, b) => a.key - b.key);

        var geojson = {
            "type": "MultiPoint",
            "coordinates": data.map(d => [d['experiment8_field.long'].value, d['experiment8_field.lat'].value])
        }

        const fieldOutline = {
            "type": "MultiLineString",
            "coordinates": [
                [[174.811988, -36.918793], [174.812052, -36.917752], [174.812815, -36.917783], [174.812750, -36.918826], [174.811988, -36.918793]]
            ]
        }

        const meterMarkings = {
            "type": "MultiLineString",
            "coordinates": [
                [[174.812755, -36.918755], [174.811993, -36.918720]],
                [[174.811998, -36.918632], [174.812761, -36.918665]],
                [[174.812004, -36.918542], [174.812767, -36.918575]],
                [[174.812009, -36.918452], [174.812773, -36.918485]],
                [[174.812015, -36.918363], [174.812779, -36.918394]],
                [[174.812021, -36.918274], [174.812784, -36.918305]],
                [[174.812026, -36.918182], [174.812789, -36.918214]],
                [[174.812031, -36.918092], [174.812795, -36.918125]],
                [[174.812037, -36.918003], [174.812800, -36.918035]],
                [[174.812043, -36.917912], [174.812806, -36.917945]],
                [[174.812048, -36.917822], [174.812811, -36.917855]]
            ]
        }
        const tryLines = {
            "type": "MultiLineString",
            "coordinates": [
                [[174.812755, -36.918755], [174.811993, -36.918720]],
                [[174.812021, -36.918274], [174.812784, -36.918305]],
                [[174.812048, -36.917822], [174.812811, -36.917855]]
            ]
        }

        var projection = geoMercator();
        projection.rotate([0, 0, -89.7]);
        projection.fitExtent([[0, 0], [scatterWidth, scatterHeight]], fieldOutline);

        var fieldPath = geoPath(projection)

        _chartSvg.selectAll("#field-markings").selectAll("path .meter-markings")
            .data([meterMarkings])
            .join("path")
            .attr("d", fieldPath)
            .attr("stroke", "#F2F2F2")
            .attr("stroke-dasharray", "9")

        _chartSvg.selectAll("#field-outline").selectAll("path")
            .data([fieldOutline])
            .join("path")
            .attr("d", fieldPath)
            .attr("fill", "#8ed7b3")
            .attr("stroke", "black")

        _chartSvg.selectAll("#field-markings").selectAll("path .try-line")
            .data([tryLines])
            .join("path")
            .attr("d", fieldPath)
            .attr("stroke", "#F2F2F2")

        _slider.on('onchange', val => {
            var inputForPlayerMap = []
            timePeriods[Math.floor(timePeriods.length * val) - 1].values.forEach(function (d) {
                var location = projection([d['experiment8_field.long'].value, d['experiment8_field.lat'].value])
                var p = {
                    x: location[0],
                    y: location[1],
                    playerId: d['experiment8_field.id'].value,
                    teamName: d['experiment8_field.team_name'].value,
                    role: d['experiment8_field.position_name'].value,
                    inPossession: d['experiment8_field.in_possession'].value,
                    teamIndex: (d['experiment8_field.team_name'].value == teamIndex[0] ? 0 : 1)
                }
                inputForPlayerMap.push(p);
            });
            this.updateScatter(_chartSvg, inputForPlayerMap)
        });

        _timeSlider.call(_slider)

        done()
    }
})