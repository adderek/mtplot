// FIXME: jeśli ustawiam minX i maxX to chcę aby tylko ten czas był wyświetlony
// i rysownaie ostatniego bar'a musi być inaczej liczone

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

    minX;
    maxX;

    /** @type number */
    #lowValueThreshold = 0.02;  // 2% by default

    /** @type number */
    #consecutiveDaysThreshold = 2;  // 2 days by default

    /** @type number */
    #stagnationDaysThreshold = 3;  // 3 consecutive days default

    /** @type number */
    #stagnationChangeThreshold = 0.2;  // 20% of average change

    /** @type number */
    #activeChangeDaysPercentage = 0.85;  // 85% of days should show change

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
     * Configure low value detection settings
     * @param {object} options
     * @param {number} [options.threshold] - Threshold for low value (0-1, representing percentage of range)
     * @param {number} [options.consecutiveDays] - Number of consecutive days required to trigger warning
     */
    configureLowValueDetection(options = {}) {
        if (options.threshold !== undefined) {
            this.#lowValueThreshold = Math.max(0, Math.min(1, options.threshold));
        }
        if (options.consecutiveDays !== undefined) {
            this.#consecutiveDaysThreshold = Math.max(1, options.consecutiveDays);
        }
    }

    /**
     * Configure stagnation detection settings
     * @param {object} options
     * @param {number} [options.consecutiveDays] - Number of consecutive days to detect stagnation
     * @param {number} [options.changeThreshold] - Fraction of average daily change to consider significant (0-1)
     * @param {number} [options.activeChangePercentage] - Required percentage of days with changes (0-1)
     */
    configureStagnationDetection(options = {}) {
        if (options.consecutiveDays !== undefined) {
            this.#stagnationDaysThreshold = Math.max(1, options.consecutiveDays);
        }
        if (options.changeThreshold !== undefined) {
            this.#stagnationChangeThreshold = Math.max(0, options.changeThreshold);
        }
        if (options.activeChangePercentage !== undefined) {
            this.#activeChangeDaysPercentage = Math.max(0, Math.min(1, options.activeChangePercentage));
        }
    }

    /**
     * Check if a sequence of points represents consecutive low values
     * @param {Array<{x:Date, y:number}>} points - Array of consecutive points to check
     * @param {number} lowThreshold - The Y value threshold for low values
     * @returns {boolean}
     */
    #isConsecutiveLowValues(points, lowThreshold) {
        if (points.length < this.#consecutiveDaysThreshold) return false;
        
        // Check if points are consecutive days
        for (let i = 1; i < points.length; i++) {
            const daysDiff = (points[i].x.valueOf() - points[i-1].x.valueOf()) / (24 * 60 * 60 * 1000);
            if (daysDiff > 1.1) return false; // Allow small tolerance for time differences
        }

        // Check if all values are below threshold
        return points.every(p => p.y <= lowThreshold);
    }

    /**
     * Calculate the average absolute change between consecutive points
     * @param {Array<{x:Date, y:number}>} points
     * @returns {number}
     */
    #calculateAverageChange(points) {
        if (points.length < 2) return 0;
        let totalChange = 0;
        let changes = 0;
        
        for (let i = 1; i < points.length; i++) {
            const change = Math.abs(points[i].y - points[i-1].y);
            if (change > 0) {
                totalChange += change;
                changes++;
            }
        }
        
        return changes > 0 ? totalChange / changes : 0;
    }

    /**
     * Check if a sequence represents a period of stagnation
     * @param {Array<{x:Date, y:number}>} points - Points to check
     * @param {number} avgDailyChange - Average daily change across all data
     * @returns {boolean}
     */
    #isStagnationPeriod(points, avgDailyChange) {
        if (points.length < this.#stagnationDaysThreshold) return false;
        
        // Check if points are consecutive days
        for (let i = 1; i < points.length; i++) {
            const daysDiff = (points[i].x.valueOf() - points[i-1].x.valueOf()) / (24 * 60 * 60 * 1000);
            if (daysDiff > 1.1) return false;
        }

        // Check if changes are below threshold
        const significantChangeThreshold = avgDailyChange * this.#stagnationChangeThreshold;
        for (let i = 1; i < points.length; i++) {
            const change = Math.abs(points[i].y - points[i-1].y);
            if (change > significantChangeThreshold) return false;
        }

        return true;
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
        const valueRange = highestValue - lowestValue;
        const lowValueThreshold = lowestValue + (valueRange * this.#lowValueThreshold);

        // Calculate average daily change
        const avgDailyChange = this.#calculateAverageChange(d);

        // Count days with significant changes to verify we meet the active change percentage
        let daysWithSignificantChange = 0;
        for (let i = 1; i < d.length; i++) {
            const change = Math.abs(d[i].y - d[i-1].y);
            if (change > avgDailyChange * this.#stagnationChangeThreshold) {
                daysWithSignificantChange++;
            }
        }

        const hasEnoughActiveChanges = 
            daysWithSignificantChange / (d.length - 1) >= this.#activeChangeDaysPercentage;

        let xScale, yScale;
        if (this.minX!==undefined && this.maxX!==undefined) {
            xScale = (w-10) / (this.maxX - this.minX);
        } else {
            /** @type {number} */
            const xLen = (d[d.length - 1].x.valueOf() - d[0].x.valueOf());
            if (!xLen) return;
            xScale = (w-10) / xLen;
        }
        yScale = h / valueRange;

        // Only check for stagnation if we have enough active changes overall
        if (hasEnoughActiveChanges) {
            // Find sequences of stagnation
            let currentStagnationSequence = [];
            for (let i = 0; i < d.length; i++) {
                currentStagnationSequence.push(d[i]);
                
                if (i === d.length - 1 || Math.abs(d[i+1].y - d[i].y) > avgDailyChange * this.#stagnationChangeThreshold) {
                    if (this.#isStagnationPeriod(currentStagnationSequence, avgDailyChange)) {
                        // Draw orange rectangle for the stagnation period
                        const rect = document.createElementNS(ns, "rect");
                        const startX = xScale * (currentStagnationSequence[0].x.valueOf() - d[0].x.valueOf());
                        const width = xScale * (
                            currentStagnationSequence[currentStagnationSequence.length - 1].x.valueOf() - 
                            currentStagnationSequence[0].x.valueOf()
                        );
                        rect.setAttribute("x", `${startX}`);
                        rect.setAttribute("y", "0");
                        rect.setAttribute("width", `${width + (i === d.length-1 ? 10 : 0)}`);
                        rect.setAttribute("height", `${h}`);
                        rect.setAttribute("fill", "rgba(255,165,0,0.2)");
                        this.svg.appendChild(rect);
                    }
                    currentStagnationSequence = [];
                }
            }
        }

        // Find sequences of low values
        let currentLowSequence = [];
        for (let i = 0; i < d.length; i++) {
            if (d[i].y <= lowValueThreshold) {
                currentLowSequence.push(d[i]);
            } else {
                if (this.#isConsecutiveLowValues(currentLowSequence, lowValueThreshold)) {
                    // Draw red rectangle for the sequence
                    const rect = document.createElementNS(ns, "rect");
                    const startX = xScale * (currentLowSequence[0].x.valueOf() - d[0].x.valueOf());
                    const width = xScale * (currentLowSequence[currentLowSequence.length - 1].x.valueOf() - currentLowSequence[0].x.valueOf());
                    rect.setAttribute("x", `${startX}`);
                    rect.setAttribute("y", "0");
                    rect.setAttribute("width", `${width + (i === d.length-1 ? 10 : 0)}`);
                    rect.setAttribute("height", `${h}`);
                    rect.setAttribute("fill", "rgba(255,0,0,0.2)");
                    this.svg.appendChild(rect);
                }
                currentLowSequence = [];
            }
        }
        // Check last sequence
        if (this.#isConsecutiveLowValues(currentLowSequence, lowValueThreshold)) {
            const rect = document.createElementNS(ns, "rect");
            const startX = xScale * (currentLowSequence[0].x.valueOf() - d[0].x.valueOf());
            const width = xScale * (currentLowSequence[currentLowSequence.length - 1].x.valueOf() - currentLowSequence[0].x.valueOf());
            rect.setAttribute("x", `${startX}`);
            rect.setAttribute("y", "0");
            rect.setAttribute("width", `${width + 10}`);
            rect.setAttribute("height", `${h}`);
            rect.setAttribute("fill", "rgba(255,0,0,0.2)");
            this.svg.appendChild(rect);
        }

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
