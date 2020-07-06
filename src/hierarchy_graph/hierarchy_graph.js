import * as d3 from "d3";


const options = {
    child: {
        order: 1,
        display: "select",
        type: "string",
        label: "Child Field",
        section: "Field Selection",
        values: []
    },
    parent: {
        order: 2,
        display: "select",
        type: "string",
        label: "Parent Field",
        section: "Field Selection",
        values: []
    }
};

function validateDataAndConfig(queryResponse, config) {
    var errors = [];
    if (queryResponse.fields.dimension_like.length < 2) {
        errors.push({ title: "No Dimensions", message: "This visualisation requires 2 dimensions" });
    }

    if (!config.hasOwnProperty('child') || !config.hasOwnProperty('parent'))
        errors.push({ title: "Select 2 Fields", message: "Please select at 2 fields from the visualisation options" });

    return errors;
}

function getOptionValues(queryResponse, existingOptions) {
    var roleFields = [];
    var parentFields = [];

    queryResponse.fields.dimension_like.forEach(element => {
        switch (element.type) {
            case 'string':
                roleFields.push({ [element.label]: element.name });
                parentFields.push({ [element.label]: element.name });
                break;
        }
    });

    var newOptions = { ...existingOptions };

    newOptions["child"].values = roleFields;
    newOptions["parent"].values = parentFields;

    return newOptions;
}

function parseData(data, config) {
    var counts = {};
    const root = d3.stratify()
        .id(d => {
            if (!counts[d[config.child].value]) {
                counts[d[config.child].value] = 1;
                return d[config.child].value;
            } else {
                return d[config.child].value + " " + ++counts[d[config.child].value];
            }
        })
        .parentId(d => d[config.parent].value)
        (data);

    return root;
}

const svg = d3.create("svg")
    .attr("viewBox", [0, 0, 1500, 1500])
    .style("font", "8px sans-serif")
    .style("overflow", "visible");

const gLink = svg.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5)

const gNode = svg.append("g")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all")
    .attr("stroke-linejoin", "round")
    .attr("stroke-width", 3);

var root;

function drawGraph(source, width) {
    const links = root.links();
    var treeLink = d3.linkHorizontal().x(d => d.y).y(d => d.x);

    // var tree = d3.tree().size([width, height]);
    var tree = d3.tree().nodeSize([12, 150]);

    tree(root);

    let left = root;
    let right = root;

    root.each(node => {
        if (node.x < left.x) left = node;
        if (node.x > right.x) right = node;
    });

    const height = right.x - left.x + 30;

    const transition = svg.transition()
        .duration(250)
        .attr("viewBox", [-100, left.x - 20, width, height])

    // Update the nodes…
    const node = gNode.selectAll("g")
        .data(root.descendants(), d => d.id);
    // .attr("transform", d => `translate(${d.x},${d.y})`);

    // Enter any new nodes at the parent's previous position.
    const nodeEnter = node.enter().append("g")
        .attr("transform", d => `translate(${source.y0},${source.x0})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0)
        .on("click", d => {
            d.children = d.children ? null : d._children;
            drawGraph(d, width);
        });

    nodeEnter.append("circle")
        .attr("r", 2.5)
        .attr("fill", d => d._children ? "#555" : "#999")
        .attr("stroke-width", 10);

    // gNode.append("circle")
    //     .attr("fill", d => d.children ? "#555" : "#999")
    //     .attr("r", 2.5);
    nodeEnter.append("text")
        .attr("dy", "0.31em")
        .attr("x", d => d.depth == 0 ? -6 : 6)
        // .attr("x", d => d._children ? -6 : 6)
        .attr("text-anchor", d => d.depth == 0 ? "end" : "start")
        // .attr("text-anchor", d => d._children ? "end" : "start")
        // .text(d => d.data.name)
        .text(d => d.id)
        .clone(true).lower()
        // .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .attr("stroke", "white");

    // Transition nodes to their new position.
    const nodeUpdate = node.merge(nodeEnter).transition(transition)
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    // Transition exiting nodes to the parent's new position.
    const nodeExit = node.exit().transition(transition).remove()
        .attr("transform", d => `translate(${source.y},${source.x})`)
        .attr("fill-opacity", 0)
        .attr("stroke-opacity", 0);

    // Update the links…
    const link = gLink.selectAll("path")
        .data(links, d => d.target.id);

    // Enter any new links at the parent's previous position.
    const linkEnter = link.enter().append("path")
        .attr("d", d => {
            const o = { x: source.x0, y: source.y0 };
            return treeLink({ source: o, target: o });
        });

    // Transition links to their new position.
    link.merge(linkEnter).transition(transition)
        .attr("d", treeLink);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition(transition).remove()
        .attr("d", d => {
            const o = { x: source.x, y: source.y };
            return treeLink({ source: o, target: o });
        });

    // Stash the old positions for transition.
    root.eachBefore(d => {
        d.x0 = d.x;
        d.y0 = d.y;
    });

    return svg.node();
}

looker.plugins.visualizations.add({
    options: options,
    create: function (element, config) {
        element.innerHTML = `
        <style>
        </style>`;

        this.hierarchyDiv = d3.select("#vis")
    },

    // Render in response to the data or settings changing
    updateAsync: function (data, element, config, queryResponse, details, done) {
        this.clearErrors();

        const width = element.clientWidth;
        const height = element.clientHeight;
        const div = this.hierarchyDiv.html('')

        // Based on the fields in the data update the configuration options
        const opts = getOptionValues(queryResponse, this.options);
        this.trigger('registerOptions', opts);

        const errors = validateDataAndConfig(queryResponse, config)
        errors.forEach(error => {
            this.addError(error);
            return
        })

        const parsedHierarchy = parseData(data, config);
        parsedHierarchy.x0 = 0;
        parsedHierarchy.y0 = 0;
        parsedHierarchy.descendants().forEach((d, i) => {
            d._children = d.children;
            if (d.depth > 0) d.children = null;
        });

        root = parsedHierarchy;
        const node = drawGraph(parsedHierarchy, width);
        element.appendChild(node);

        done();
    }
});
