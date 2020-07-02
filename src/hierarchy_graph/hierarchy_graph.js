import * as d3 from "d3";


var options = {
    role: {
        order: 1,
        display: "select",
        type: "string",
        label: "Role Field",
        section: "Field Selection"
    },
    parent: {
        order: 2,
        display: "select",
        type: "string",
        label: "Parent Role Field",
        section: "Field Selection"
    }
};

function modifyOptions(vis, queryResponse, existingOptions) {
    var roleFields = [];
    var parentFields = [];
    console.log(queryResponse);

    queryResponse.fields.dimension_like.forEach(element => {
        switch (element.type) {
            case 'string':
                roleFields.push({ [element.label]: element.name });
                parentFields.push({ [element.label]: element.name });
                break;
        }
    });

    var newOptions = { ...existingOptions };

    newOptions["role"].values = roleFields;
    newOptions["parent"].values = parentFields;

    vis.trigger('registerOptions', newOptions);
}

looker.plugins.visualizations.add({
    options: options,
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
        modifyOptions(this, queryResponse, options)

        const width = element.clientWidth;
        const height = element.clientHeight;

        const svg = this.hierarchySvg
            .html('')
            .attr('width', '100%')
            .attr('height', '100%');


        
        
        
        done();
    }
});
