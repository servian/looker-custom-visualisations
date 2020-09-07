//import * as d3 from "d3";

looker.plugins.visualizations.add({

  create: function (element, config) {

    element.innerHTML = `
    <style>
    </style>
    `;

    this.svgViolin = d3.select("#vis").append("svg")

  },

  updateAsync: function (data, element, config, queryResponse, details, done) {

    // Clear any errors from previous updates.
    this.clearErrors();

    // Throw some errors and exit if the shape of the data isn't what this chart needs.
    if (queryResponse.fields.dimensions.length == 0) {
      this.addError({title: "No Dimensions", message: "This chart requires dimensions."});
      return;
    }

    // Sizing
    var width = element.clientWidth;
    console.log("width:")
    console.log(width)

    var height = element.clientHeight - 100;
    console.log("height:")
    console.log(height)

    var svg = this.svgViolin
      .html('')
      .attr('width', '100%')
      .attr('height', '100%')
  
    // Variables from dataset
    var featureName = "customer_segments_labels.channel_grouping_count" // ---- >>>>>> dynamically swap out <<<<<< ---- //
    var centroidIDFeatureName = "customer_segments_labels.centroid_id" 
    
    var new_data = data.map(function(d) {
      var container = {};
      container[featureName] = d[featureName].value.toString();
      container[centroidIDFeatureName] = d[centroidIDFeatureName].value.toString();
      return container
    })
      
    var featureData = new_data.map(function(d) {return parseInt(d[featureName])})
    var featureDataMax = d3.max(featureData)
  
    console.log("featureDataMax")
    console.log(featureDataMax)

    //var centroidIDFeatureName = "customer_segments_labels.centroid_id" 
    var centroids = new_data.map(function(d) {return d[centroidIDFeatureName];})
    var centroidsSet = new Set(centroids)
    var centroidsDistinct = Array.from(centroidsSet).sort()
  
    console.log("centroidsDistinct")
    console.log(centroidsDistinct)
  
    // Build and Show the Y scale
    var y = d3.scaleLinear()
      .domain([0, featureDataMax + 1 ]) //featureDataMax  // Note that here the Y scale is set manually //--->>>> swap 15 out for max(of selected column)
      .range([height, 0])
    
    this.svgViolin.append("g").attr("transform", "translate(" + 25 + "," + 10 + ")").call(d3.axisLeft(y))
  
    // Build and Show the X scale. It is a band scale like for a boxplot: each group has an dedicated RANGE on the axis. This range has a length of x.bandwidth
    var x = d3.scaleBand()
      .range([ 0, width ]) //.range([ 0, width ])
      .domain(centroidsDistinct)
      .padding(0.25)    // This is important: it is the space between 2 groups. 0 means no padding. 1 is the maximum.
    
    this.svgViolin.append("g").attr("transform", "translate(25," + (height + 11) + ")").call(d3.axisBottom(x))
  
    // Features of the histogram
    var histogram = d3.histogram()
      .domain(y.domain())
      .thresholds(y.ticks(10))    // Important: how many bins approx are going to be made? It is the 'resolution' of the violin plot
      .value(d => d)

    // Compute the binning for each group of the dataset
    var sumstat = d3.nest()  // nest function allows to group the calculation per level of a factor
      .key(function(d) { return d[centroidIDFeatureName];}) 
      .rollup(function(d) {   // For each key..
        input = d.map(function(g) {return g[featureName];})    // Keep the variable called ? 
        bins = histogram(input)   // And compute the binning on it.
        return(bins)
      })
      .entries(new_data)

    console.log("sumstat:")
    console.log(sumstat)

    // What is the biggest number of value in a bin? We need it cause this value will have a width of 100% of the bandwidth.
    var maxNum = 0
    for ( i in sumstat ){
      allBins = sumstat[i].value
      lengths = allBins.map(function(a){return a.length;})
      longuest = d3.max(lengths)
      if (longuest > maxNum) { maxNum = longuest }
    }

    // The maximum width of a violin must be x.bandwidth = the width dedicated to a group
    var xNum = d3.scaleLinear()
      .range([0, x.bandwidth()])
      .domain([-maxNum,maxNum])

    // Add the shape to this svg!
    this.svgViolin.selectAll("#vis").data(sumstat).enter()        // So now we are working group per group
      .append("g").attr("transform", function(d){ return("translate(" + (x(d.key) + 25) + " , 11)") } ) // Translation on the right to be at the group position
      .append("path").datum(function(d){ return(d.value)})     // So now we are working bin per bin
      .style("stroke", "none")
      .style("fill","#69b3a2")
      .attr("d", d3.area()
          .x0(function(d){ return(xNum(-d.length)) } )
          .x1(function(d){ return(xNum(d.length)) } )
          .y(function(d){ return(y(d.x0)) } )
          .curve(d3.curveCatmullRom)    // This makes the line smoother to give the violin appearance. Try d3.curveStep to see the difference
      )

    done()

  }
});