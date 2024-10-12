// @ts-check

const ns = "http://www.w3.org/2000/svg";
export default class MTPlot {
    /**
     * Sorted array of {x:Date, y:number} (it is sorted with intervals after update)
     * @type {Array<{x:Date, y:number}>}
     * @readonly
     * @deprecated Use proxy instead (the .data gets sorted internally with a potential delay and unsorted data cause issues)
    */
    rawData;

    /** @readonly @type string */
    id;

    /** @readonly @type SVGSVGElement */
    svg;

    /** @type boolean */
    #dirty;

    /** @type number */
    refreshDelay = 100;

    /**
     * Proxy (it detects whenever you update it) to a data array
     * @type {Array<{x:Date, y:number}>}
     */
    dataProxy;

    /** @type number|null */
    #timeout;

    /**
     * Plot resolution in X axis
     * Default is initial array length or 365
     * @type number
     */
    w;

    /**
     * Plot resolution in Y axis
     * Default is 100
     * @type number
     */
    h = 100;

    /**
     * Create new MTPlot instance
     * within parent HTMLElement having given id
     * and with data from given array of {x:Date, y:number}
     * @param {string} id Parent element id
     * @param {Array<{x:Date, y:number}>} [data] Optional initial data array
     */
    constructor(id, data=[]) {
        this.rawData = [...data].sort((a, b) => a.x - b.x);
        const [w,h] = [this.w = data.length || 365, this.h];
        this.dataProxy = new Proxy(this.rawData, {
            set: (target, property, value) => {
                console.log(this.#dirty, this.#timeout, property);
                if (!this.#dirty) {
                    this.#dirty = true;
                    this.#triggerUpdate();
                }
                target[property] = value;
                return true;
            }
        });

        const parent = document.getElementById(id);
        if (!parent) {
            throw new Error(`No element #${id}`);
        }
        this.svg = parent.querySelector("svg");
        if (!this.svg) {
            this.svg = document.createElementNS(ns, "svg");
            const attributes = [
            ["version", "1.1"],
            ["width", "100%"],
            ["height", "100%"],
            ["xmlns", ns],
            ["viewBox", `0 0 ${w} ${h}`],
            ["preserveAspectRatio", "none"],
            ["style", "width: 100%; height: 100%;"]
            ];

            attributes.forEach(([name, value]) => {
            this.svg.setAttribute(name, value);
            });
            parent.appendChild(this.svg);
        }
        this.#dirty = true;
        this.update();
    }

    #triggerUpdate() {
        console.log('triggerUpdate', this.#dirty, this.#timeout);
        if (this.#timeout) return; // already in progress
        this.#timeout = setTimeout(() => {
            console.log('timeout', this.refreshDelay);
            this.#timeout = null;
            this.update();
        }, this.refreshDelay);
        console.log(this.refreshDelay);
    }
    #sortData() {
        this.rawData.sort((a, b) => a.x - b.x);
    }

    /**
     * Force plot refresh
     * @deprecated Normally called automatically
     */
    update() {
        console.log('update', this.#dirty, this.rawData, this.#timeout);
        this.svg.innerHTML = ""; // clear SVG
        this.#dirty = false;
        if (this.#timeout) {
            clearTimeout(this.#timeout);
            this.#timeout = null;
        }
        const [w,h] = [this.w, this.h];

        const d = this.rawData;
        if (!d.length) return;

        d.sort((a, b) => a.x.valueOf() - b.x.valueOf());
        const lowestValue = d.reduce((a, b) => a.y < b.y ? a : b).y;
        const highestValue = d.reduce((a, b) => a.y > b.y ? a : b).y;

        /** @type {number} */
        const xLen = (d[d.length - 1].x.valueOf() - d[0].x.valueOf());
        if (!xLen) return;

        const xScale = (w-10) / xLen;
        const yScale = h / (highestValue - lowestValue);
        for (let i = 0; i < d.length; i++) {
            const rect = document.createElementNS(ns, "rect");
            rect.setAttribute("x", `${xScale * (d[i].x.valueOf() - d[0].x.valueOf())}`);
            const wh = yScale * (d[i].y-lowestValue);
            rect.setAttribute("y",`${100-wh}`);
            rect.setAttribute("width",
                (
                    i < d.length-1
                    ? xScale * (d[i + 1].x.valueOf() - d[i].x.valueOf())
                    : 10
                ).toString()
            );
            rect.setAttribute("height", `${wh}`);
            rect.setAttribute("fill", i < d.length-1 ? "black" : "blue");
            rect.addEventListener("mouseover", () => {
                const textVal = document.createElementNS(ns, "text");
                const s = textVal.setAttribute.bind(textVal);
                s('x',0);
                s('y',h*.15);
                s('fill', "white");
                s('stroke', "red");
                s('stroke-width', 1);
                s('font-family', "monospace");
                textVal.textContent = `${d[i].x.toISOString()} ${Math.round(d[i].y)}`;
                // create a clone of the text element
                /** @type {SVGTextElement} */
                const textValClone = /** @type {SVGTextElement} */ (textVal.cloneNode(true));
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

    /**
     * Replace the newest (sorts, then replaces the first) data point
     * @param {object} param0 
     * @param {Date} param0.x
     * @param {number} param0.y
     */
    replaceOldest({x, y}) {
        if (this.#dirty) {
            this.#sortData();
        } else {
            this.#dirty = true;
        }
        this.rawData[0] = {x, y};
        this.#triggerUpdate();
    }

    /**
     * Replace the newest (sorts, then replaces the last) data point
     * @param {object} param0 
     * @param {Date} param0.x
     * @param {number} param0.y
     */
    replaceNewest({x, y}) {
        if (this.#dirty) {
            this.#sortData();
        } else {
            this.#dirty = true;
        }
        this.rawData[this.rawData.length-1] = {x, y};
        this.#triggerUpdate();
    }
    /**
     * Reset data and clear the plot
     * @returns {void}
     */
    reset() {
        this.rawData.length = 0;
        this.#dirty = true;
        this.update();
    }
}
