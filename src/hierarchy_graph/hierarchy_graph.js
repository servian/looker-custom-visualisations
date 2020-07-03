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
        errors.push({ title: "Select 2 Fields", message: "Please select at 2 fields from the visualisation options"});
    
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
            if(!counts[d[config.child].value]) {
                counts[d[config.child].value] = 1;
                return d[config.child].value;
            }else{
                return d[config.child].value + " " + ++counts[d[config.child].value];
            }
        })
        .parentId(d => d[config.parent].value)
        (data);

    return root;
}


function drawGraph(root, width, height, {
    label = d => d.data.id, 
    highlight = () => false,
    marginLeft = 40
  } = {}) {

    var treeLink = d3.linkHorizontal().x(d => d.y).y(d => d.x);

    var tree = d3.tree().size([width, height]);

    root = tree(root);
    console.log(root);
  
    let xLowest = Infinity;
    let xHighest = -Infinity;
    root.each(d => {
      if (d.x > xHighest) xHighest= d.x;
      if (d.x < xLowest) xLowest = d.x;
    });
  
    const svg = d3.create("svg")
        .attr("width", width)
        .attr("height", height)
        // .attr("viewBox", [0, 0, width, xLowest -  xHighest])
        .attr("viewBox", [0, 0, width, xHighest - xLowest + 15])
        .style("overflow", "visible");
    
    const g = svg.append("g")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        // .attr("transform", `translate(${marginLeft},${dx - x0})`);
      
    const link = g.append("g")
      .attr("fill", "none")
      .attr("stroke", "#555")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
    .selectAll("path")
      .data(root.links())
      .join("path")
        .attr("stroke", d => highlight(d.source) && highlight(d.target) ? "red" : null)
        .attr("stroke-opacity", d => highlight(d.source) && highlight(d.target) ? 1 : null)
        .attr("d", treeLink);
    
    const node = g.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
      .selectAll("g")
      .data(root.descendants())
      .join("g")
        .attr("transform", d => `translate(${d.y},${d.x})`);
        // .attr("transform", d => `translate(${d.x},${d.y})`);
  
    node.append("circle")
        .attr("fill", d => highlight(d) ? "red" : d.children ? "#555" : "#999")
        .attr("r", 2.5);
  
    node.append("text")
        .attr("fill", d => highlight(d) ? "red" : null)
        .attr("dy", "0.31em")
        // .attr("dy", "0.31em")
        // .attr("x", d => d.children ? -6 : 6)
        .attr("x", d => d.depth == 0 ? -6 : 6)
        // .attr("y", d => d.children ? "1em" : "0.31em")
        // .attr("y", -10)
        .attr("text-anchor", d => d.depth == 0 ? "end" : "start")
        // .text(label)
        .text(d => d.id)
      .clone(true).lower()
        .attr("stroke", "white");
    
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
        const node = drawGraph(parsedHierarchy, width, height);
        element.appendChild(node);

        
        
        done();
    }
});
