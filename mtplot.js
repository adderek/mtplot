/* JS module that creates SVG element and appends it to given DOM element (or reuses existing one)
It is first initialized with new MTPlot(id,data) which has DOM element id that it should be appended to and optional data array.
Returned value is a new instance of MTPlot class.

The data is an array of {x:Date, y:number} values. It can be accessed by mtplot.data.
The dataset can be updated. A proxy pattern is used to detect data changes.

x is a JavaScript Date, y is a number
Whenever data are updated, SVG is updated and redrawn.
X axis starts at earliest x value and ends at latest x value
Y axis starts at 0 and ends at max y value
*/

const ns = "http://www.w3.org/2000/svg";
const w = 365;
export default class MTPlot {
    constructor(id, data) {
        this.id = id;
        this.data = data;
        this.proxy = new Proxy(this.data, {
            set: (target, property, value) => {
                target[property] = value;
                this.update();
                return true;
            }
        });
        this.init();
    }
    init() {
        this.parent = document.getElementById(this.id);
        if (!this.parent) {
            this.parent = document.createElement("div");
            this.parent.setAttribute("id", this.id);
            document.body.appendChild(this.parent);
        }
        this.svg = document.getElementById(this.id).querySelector("svg");
        if (!this.svg) {
            this.svg = document.createElementNS(ns, "svg");
            this.svg.setAttribute("version", "1.1");
            this.svg.setAttribute("width", "100%");
            this.svg.setAttribute("height", "100%");
            this.svg.setAttribute("xmlns", ns);
            this.svg.setAttribute("viewBox", `0 0 ${w} 100`);
            this.svg.setAttribute("preserveAspectRatio", "none");
            this.svg.setAttribute("style", "width: 100%; height: 100%;");
            document.getElementById(this.id).appendChild(this.svg);
        }
        this.update();
    }
    update() {
        this.svg.innerHTML = "";
        this.draw();
    }
    draw() {
        this.drawXAxis();
        this.drawData();
    }
    drawXAxis() {
        const xAxis = document.createElementNS(ns, "line");
        xAxis.setAttribute("x1", "0");
        xAxis.setAttribute("y1", "100");
        xAxis.setAttribute("x2", w);
        xAxis.setAttribute("y2", "100");
        xAxis.setAttribute("stroke", "black");
        xAxis.setAttribute("stroke-width", "1");
        this.svg.appendChild(xAxis);
    }
    drawYAxis() {
        const yAxis = document.createElementNS(ns, "line");
        yAxis.setAttribute("x1", "0");
        yAxis.setAttribute("y1", "0");
        yAxis.setAttribute("x2", "0");
        yAxis.setAttribute("y2", "100");
        yAxis.setAttribute("stroke", "black");
        yAxis.setAttribute("stroke-width", "1");
        this.svg.appendChild(yAxis);
    }
    drawData() {
        if (this.data.length === 0) {
            return;
        }
        const data = this.data;
        data.sort((a, b) => a.x - b.x);
        const earliestDate = data[0].x;
        const latestDate = data[data.length - 1].x;
        const lowestValue = data.reduce((a, b) => a.y < b.y ? a : b).y;
        const highestValue = data.reduce((a, b) => a.y > b.y ? a : b).y;
        console.log(earliestDate, latestDate, lowestValue, highestValue);

        const xScale = w / (data[data.length - 1].x - data[0].x);
        //const yScale = 100 / (data[data.length - 1].y - data[0].y);
        const yScale = 100 / (highestValue - lowestValue);
        for (let i = 0; i < data.length; i++) {
            const rect = document.createElementNS(ns, "rect");
            rect.setAttribute("x", Math.min(xScale * (data[i].x - data[0].x), w));
            //rect.setAttribute("y", 100 - yScale * (data[i].y - data[0].y));
            rect.setAttribute("y", 100 - yScale * (data[i].y - lowestValue));
            rect.setAttribute("width", i < data.length - 1 ? xScale * (data[i + 1].x - data[i].x) : 0);
            //rect.setAttribute("height", yScale * data[i].y);
            rect.setAttribute("height", yScale * data[i].y);
            rect.setAttribute("fill", "black");
            rect.addEventListener("mouseover", () => {
                const textVal = document.createElementNS(ns, "text");
                const s = textVal.setAttribute.bind(textVal);
                s('x',15);
                s('y',15);
                s('textLength', "100%");
                s('fill', "white");
                s('stroke', "red");
                s('stroke-width', 1);
                s('font-family', "monospace");
                textVal.textContent = `${data[i].x.toISOString()}, ${Math.round(data[i].y)}`;
                // create a clone of the text element
                const textValClone = textVal.cloneNode(true);
                textValClone.setAttribute("stroke", "white");
                textValClone.setAttribute("stroke-width", "3");
                this.svg.appendChild(textValClone);
                this.svg.appendChild(textVal);
            });
            rect.addEventListener("mouseout", () => {
                this.svg.querySelectorAll("text").forEach(text => text.remove());
            });
            this.svg.appendChild(rect);
        }
    }

    addData(data) {
        this.proxy.push(data);
    }
    clearData() {
        this.proxy = new Proxy(this.data, {
            set: (target, property, value) => {
                target[property] = value;
                this.update();
                return true;
            }
        });
    }
    removeData(index) {
        this.proxy.splice(index, 1);
    }
    getData() {
        return this.proxy;
    }
    setData(data) {
        this.proxy = new Proxy(data, {
            set: (target, property, value) => {
                target[property] = value;
                this.update();
                return true;
            }
        });
    }
}

//window.MTPlot = MTPlot;

/*

mtplot = new MTPlot("mtplot", [{ x: new Date(2020, 0, 1), y: 1 }, { x: new Date(2020, 0, 2), y: 2 }]);
*/