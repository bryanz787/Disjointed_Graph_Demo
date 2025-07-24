import React, { useRef, useEffect } from "react";
import * as d3 from "d3";
import rawData from "../data/data.json";

export default function DisjointNodeGraph() {
  const containerRef = useRef(null);

  // Support both .default and direct import (for different bundlers)
  const data = rawData.default || rawData;
  // Defensive checks for users and links
  const users = Array.isArray(data.users)
    ? data.users.map(u => ({ ...u, group: u.group ?? ((u.id % 3) + 1) }))
    : [];
  const links = Array.isArray(data.links)
    ? data.links.map(l => ({ ...l, value: l.value ?? 1 }))
    : [];

  useEffect(() => {
    const width = 928;
    const height = 680;
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const simLinks = links.map(d => ({ ...d }));
    const simUsers = users.map(d => ({ ...d }));

    const simulation = d3.forceSimulation(simUsers)
      .force("link", d3.forceLink(simLinks).id(d => d.id))
      .force("charge", d3.forceManyBody())
      .force("x", d3.forceX())
      .force("y", d3.forceY());

    const svg = d3.create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value));

    // Tooltip div (append to body for reliable overlay)
    let tooltip = d3.select("body").selectAll(".d3-tooltip").data([null]);
    tooltip = tooltip.enter()
      .append("div")
      .attr("class", "d3-tooltip")
      .merge(tooltip)
      .style("position", "absolute")
      .style("background", "rgba(0,0,0,0.8)")
      .style("color", "#fff")
      .style("padding", "6px 10px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("font-size", "14px")
      .style("z-index", 1000)
      .style("display", "none");

    const node = svg.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(simUsers)
      .join("circle")
      .attr("r", 5)
      .attr("fill", d => color(d.group))
      .on("mouseover", function(event, d) {
        tooltip
          .style("display", "block")
          .html(`<strong>ID:</strong> ${d.id}<br/><strong>Name:</strong> ${d.name}`);
      })
      .on("mousemove", function(event) {
        // Use pageX/pageY for absolute positioning
        tooltip
          .style("left", (event.pageX + 16) + "px")
          .style("top", (event.pageY - 24) + "px");
      })
      .on("mouseout", function() {
        tooltip.style("display", "none");
      });

    node.call(d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended));

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
    });

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    // Clear previous SVG if any
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      containerRef.current.appendChild(svg.node());
    }

    // Cleanup on unmount
    return () => {
      simulation.stop();
      if (tooltip) tooltip.remove();
    };
  }, [users, links]);

  return <div ref={containerRef} style={{ position: "relative" }} />;
}
