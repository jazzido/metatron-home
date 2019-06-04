import delegate from "delegate";
import { select as d3Select, selectAll as d3SelectAll } from "d3-selection";
import { random, sample, flatMap, zip } from "lodash";

/*
// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
function intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false;
  }

  var denominator = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);

  // Lines are parallel
  if (denominator === 0) {
    return false;
  }

  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator;
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator;

  // is the intersection along the segments
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return false;
  }

  // Return a object with the x and y coordinates of the intersection
  let x = x1 + ua * (x2 - x1);
  let y = y1 + ua * (y2 - y1);

  return { x, y };
}


delegate(".main-circle", "mouseover", e => console.log(e), false);

const straightPaths = Array.from(
  document.querySelectorAll("svg #cube-lines path")
);

const lineSegments = [];
for (const path of straightPaths) {
  const pathCommands = parseSVG(path.getAttribute("d"));
  makeAbsolute(pathCommands);
  for (const { command, x, x0, y, y0 } of pathCommands) {
    if (!command.includes("lineto")) continue;
    lineSegments.push([x0, y0, x, y]);
  }
}

const intersectionPoints = [];

for (var i = 0; i < lineSegments.length - 1; i++) {
  var line1 = lineSegments[i],
    line2,
    intersection;
  for (var j = i + 1; j < lineSegments.length; j++) {
    line2 = lineSegments[j];
    intersection = intersect(...[...line1, ...line2]);
    if (intersection) {
      intersectionPoints.push(intersection);
    }
  }
  }*/

const centerCircle = d3Select("svg #circle-center").node();
const centerCoords = {
  x: centerCircle.getAttribute("cx"),
  y: centerCircle.getAttribute("cy")
};

console.log(centerCoords);

function getCircleCenters(selector) {
  const circleCenters = [];
  d3SelectAll(selector).each(function(c) {
    const { x, y, width, height } = this.getBBox();
    // const x = this.getAttribute('x');
    // const y = this.getAttribute('y');
    circleCenters.push({
      x: x + width / 2,
      y: y + height / 2,
      r: width / 2,
      id: this.getAttribute("class")
    });
  });
  return circleCenters;
}

function getLinesBetweenCircleCenters(circleCenters) {
  return flatMap(circleCenters, (cc1, i) => {
    return circleCenters.slice(i + 1).map(cc2 => {
      const a = sample([cc1, cc2]);
      const b = a === cc1 ? cc2 : cc1;
      return {
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        c1: a.id,
        c2: b.id
      };
    });
  });
}

const circleCenters = getCircleCenters(
  "svg #cube-outer-circles circle, svg #cube-inner-circles circle"
);
const lines = getLinesBetweenCircleCenters(circleCenters);
const lineAnimationDurations = lines.map(line => random(20, 40) / 10);

const maxLineAnimationDuration = Math.max(...lineAnimationDurations);
const linesWithAnimationDuration = zip(lines, lineAnimationDurations).map(
  ([line, duration]) => ({ ...line, dur: `${duration}s` })
);

const singleLines = d3Select("svg #cube-single-lines")
  .selectAll("line")
  .data(linesWithAnimationDuration)
  .enter()
  .append("line")
  .attr("x1", d => d.x1)
  .attr("y1", d => d.y1)
  .attr("x2", d => d.x1)
  .attr("y2", d => d.y1);

d3Select("svg #cube-single-lines")
  .selectAll("line")
  .append("animate")
  .attr("attributeName", "x2")
  .attr("from", d => d.x1)
  .attr("to", d => d.x2)
  .attr("dur", d => d.dur)
  .attr("repeatCount", 1)
  .attr("fill", "freeze")
  .attr("begin", "0s");

d3Select("svg #cube-single-lines")
  .selectAll("line")
  .append("animate")
  .attr("attributeName", "y2")
  .attr("from", d => d.y1)
  .attr("to", d => d.y2)
  .attr("dur", d => d.dur)
  .attr("repeatCount", 1)
  .attr("fill", "freeze")
  .attr("begin", "0s");

const mainCircleCenters = getCircleCenters(
  "svg #cube-outer-circles .circle-main"
);

const mainLines = getLinesBetweenCircleCenters(mainCircleCenters);
d3Select("svg #cube-glow-lines")
  .selectAll("line")
  .data(mainLines)
  .enter()
  .append("line")
  .attr("x1", d => d.x1)
  .attr("y1", d => d.y1)
  .attr("x2", d => d.x2)
  .attr("y2", d => d.y2)
  .attr("filter", "url(#glow)")
  .style("animation-delay", `${maxLineAnimationDuration}s`);

function linesBackwards() {
  singleLines
    .selectAll("animate[attributeName=y2], animate[attributeName=x2]")
    .attr("to", (d, i, nodes) => {
      const _this = nodes[i];
      const parentDatum = d3Select(_this.parentNode).datum();
      return _this.getAttribute("attributeName").startsWith("x")
        ? parentDatum.x1
        : parentDatum.y1;
    })
    .attr("from", (d, i, nodes) => {
      const _this = nodes[i];
      const parentDatum = d3Select(_this.parentNode).datum();
      return _this.getAttribute("attributeName").startsWith("x")
        ? parentDatum.x2
        : parentDatum.y2;

      return d3Select(nodes[i].parentNode).datum().y2;
    })

    .each((d, i, nodes) => {
      nodes[i].beginElement();
    });
}

function linesForwards() {
  singleLines
    .selectAll("animate[attributeName=y2], animate[attributeName=x2]")
    .attr("to", (d, i, nodes) => {
      const _this = nodes[i];
      const parentDatum = d3Select(_this.parentNode).datum();
      return _this.getAttribute("attributeName").startsWith("x")
        ? parentDatum.x2
        : parentDatum.y2;
    })
    .attr("from", (d, i, nodes) => {
      const _this = nodes[i];
      const parentDatum = d3Select(_this.parentNode).datum();
      return _this.getAttribute("attributeName").startsWith("x")
        ? parentDatum.x1
        : parentDatum.y1;

      return d3Select(nodes[i].parentNode).datum().y2;
    })

    .each((d, i, nodes) => {
      nodes[i].beginElement();
    });
}

let nextBackwards = true;

delegate(
  "svg",
  "click",
  e => {
    nextBackwards ? linesBackwards() : linesForwards();
    nextBackwards = !nextBackwards;
  },
  false
);
