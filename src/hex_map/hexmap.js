import * as d3 from "d3"
import * as topojson from "topojson-client";
import * as d3hex from "d3-hexbin";

export class HexMap {
    constructor(mapProps, sliderProps, topojsonData, data, containerElement) {
        this.mapWidth = mapProps.width
        this.mapHeight = mapProps.height
        this.sliderWidth = sliderProps.width
        this.sliderHeight = sliderProps.height
        this.sliderTop = sliderProps.top
        this.sliderBottom = sliderProps.bottom
        this.sliderLeft = sliderProps.left
        this.sliderRight = sliderProps.right
        this.data = data
        this.topojsonData = topojsonData
        this.divContainer = d3.select(containerElement)
        this.mapSvg = this.getOrCreateSelectionFromParent(this.divContainer, "svg", "mapSvg")
        this.sliderSvg = this.getOrCreateSelectionFromParent(this.divContainer, "svg", "sliderSvg")
        this.projection = d3.geoMercator()
    }

    clear() {
        this.mapSvg.html('')
        this.sliderSvg.html('')
    }

    updateProjection(width, height, geojson){
        this.projection.fitExtent([[40, 10], [width, height]], geojson);
    }

    renderMap(featureToRender) {
        const topojsonData = this.topojsonData
        const width = this.mapWidth
        const height = this.mapHeight

        this.mapSvg
            .attr("width", width)
            .attr("height", height)

        let geojson = topojson.feature(topojsonData, topojsonData.objects[featureToRender]);
        this.updateProjection(width, height, geojson);

        let path = d3.geoPath().projection(this.projection);

        let mapGroup = this.mapSvg.append("g").attr("id", "map_group");
        let mapPath = mapGroup.append("path").attr("class", "topology");

        mapPath.datum(geojson)
            .join("path")
            .attr("d", path);
    }

    renderSlider() {
        const sliderWidth = this.sliderWidth
        const sliderHeight = this.sliderHeight
        const sliderLeft = this.sliderLeft
        const sliderRight = this.sliderRight
        const sliderTop = this.sliderTop
        const sliderBottom = this.sliderBottom
        const mapWidth = this.mapWidth
        const mapHeight = this.mapHeight
        const data = this.data

        let hexGroup = this.mapSvg.append("g").attr("id", "hex_group");

        this.sliderSvg
            .attr("height", this.sliderHeight)
            .attr("width", this.sliderWidth)

        let sliderGroup = this.sliderSvg.append("g").attr("id", "slider_group");
        let axisGroup = sliderGroup.append('g').attr("id", "axis-group");
        let brushGroup = sliderGroup.append('g').attr("id", "brush_group").attr("transform", 'translate(0,0)');

        // Draw Slider
        let timeScale = d3.scaleTime()
            .domain(d3.extent(data, d => d.timestamp))
            .range([0, sliderWidth - sliderLeft - sliderRight])
            .nice()
            .clamp(true);

        let brushResizePath = function (d) {
            let e = +(d.type === "e"),
                x = e ? 1 : -1,
                y = (sliderHeight - sliderTop - sliderBottom) / 2;
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

        sliderGroup.attr("transform", 'translate(' + sliderLeft + ',' + sliderTop + ')');

        let brushMoved = () => {
            let selection = d3.event.selection

            const hexbin = d3hex.hexbin()
                .extent([[10, 10], [mapWidth, mapHeight]])
                .radius(5)
                .x(d => this.projection([d.longitude, d.latitude])[0])
                .y(d => this.projection([d.longitude, d.latitude])[1])

            if (selection) {
                // Update the location of the slider handles
                handle.attr("display", null)
                    .attr("transform", function (d, i) {
                        return "translate(" + [selection[i], -2] + ")";
                    });
                const range = selection.map(timeScale.invert);
                this.updateHexbin(hexbin, hexGroup, data.filter(function (d) {
                    return range[0] <= d.timestamp && range[1] >= d.timestamp;
                }));
            } else {
                handle.attr("display", "none");
            }
        }

        let brush = d3.brushX()
            .extent([[0, 0], [sliderWidth - sliderLeft - sliderRight, sliderHeight - sliderTop - sliderBottom]])
            .on("brush", brushMoved)
            .on("end", brushMoved);

        axisGroup.call(d3.axisBottom(timeScale));

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

    }

    getOrCreateSelectionFromParent(parent, type, id) {
        let selection = parent.select(`${type}#${id}`)

        if (selection.empty()) {
            return parent.append(type).attr("id", id)
        } else {
            return selection
        }
    }

    updateHexbin(hexbin, hexGroup, data) {
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
}

