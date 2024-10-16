# mtPlot

## About

mini time plot

[Demo](https://adderek.github.io/mtplot/)

## Fundamental assumptions

- small size
- simplicity over features
- draws bar chart with value (Y axis) and time (X axis)
- no crazy scenarios (ex. same X for multiple points)

## Description

Plots date on X axis, values on Y axis
Shows current value on mouse over
Date is always in the international format ISO-8601

## How to use it

Import just like any other module, ex.

```
<script type="module" src="./mtplot.js"></script>
```

Initialize with an object, ex.

```
<div id="my container ID which should be unique across the whole page">
<div id="second container for another plot">
...
<script type="module">
  import MTPlot from './mtplot.js';
  document.addEventListener('DOMContentLoaded', () => {
    // Run after DOM is fully loaded to make sure that our HTML container is there

    const containerID = "my container ID which should be unique across the whole page";
    const firstPlot = new MTPlot(containerID);

    const secondContainerID = "second container for another plot";
    const secondPlot = new MTPlot(containerID, [
      {x:new Date("2020-01-01"), y:0},
      {x:new Date("2020-01-02"), y:2},
      {x:new Date("2020-01-05"), y:4},
      {x:new Date("2020-12-31"), y:3},
    ]);

    firstPlot.dataProxy.push({x:new Date("2020-01-01"), y:0}); // fast
    firstPlot.dataProxy[10] = ({x:new Date("2020-01-05"), y:5}) // fast
    firstPlot.dataProxy.unshift({x:new Date("2020-01-02"), y:2}); // slow as it must shift every value and insert one at the beginning

    // Time between dataProxy first change till plot redraw
    // default 100ms
    firstPlot.refreshDelay = 2000; // gives us 2000ms to update plot data (possibly multiple times) before it is refreshed
  });
</script>
```



/*
mtplot = new MTPlot("mtplot", [{ x: new Date(2020, 0, 1), y: 1 }, { x: new Date(2020, 0, 2), y: 2 }]);
*/


## Scripts

- sanity.sh
  `cd mtplot && scripts/sanity.sh`
  then open http://localhost:8080/sanity.html in browser
  afterwards "ctrl+c" to stop web server
