import React, { useRef, useEffect, useMemo, useState } from "react"
import * as d3 from "d3"
import rawData from "../data/data.json"

export default function DisjointNodeGraph() {
  const containerRef = useRef(null)
  const [selectedAssignments, setSelectedAssignments] = useState(
    new Set(["all"])
  )
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  // Configuration variables
  const BASE_NODE_RADIUS = 5
  const INTERACTION_SCALE_FACTOR = 1.25 // 50% increase per interaction
  const NODE_COLOUR = "#4D4DFF"
  const ISOLATED_COLOUR = "#FF4D4D"

  // Support both .default and direct import (for different bundlers)
  const data = rawData.default || rawData
  // Defensive checks for users and links
  const users = Array.isArray(data.users) ? data.users : []
  const links = Array.isArray(data.links)
    ? data.links.map((l) => ({ ...l, value: l.value ?? "Text Placeholder" }))
    : []
  const assignments = Array.isArray(data.assignments) ? data.assignments : []

  // Create a map for quick assignment lookup
  const assignmentMap = new Map(
    assignments.map((a) => [a.assignmentId, a.title])
  )

  // Handle checkbox changes
  const handleAssignmentChange = (assignmentId) => {
    const newSelected = new Set(selectedAssignments)

    if (assignmentId === "all") {
      if (newSelected.has("all")) {
        // If "all" is selected, deselect it and select all individual assignments
        newSelected.delete("all")
        assignments.forEach((assignment) =>
          newSelected.add(assignment.assignmentId.toString())
        )
      } else {
        // If "all" is not selected, select it and deselect all individual assignments
        newSelected.clear()
        newSelected.add("all")
      }
    } else {
      // Handle individual assignment selection
      if (newSelected.has(assignmentId.toString())) {
        newSelected.delete(assignmentId.toString())
        newSelected.delete("all") // Remove "all" if any individual is deselected
      } else {
        newSelected.add(assignmentId.toString())
        newSelected.delete("all") // Remove "all" if individual is selected
      }

      // If all individual assignments are selected, select "all"
      const allIndividualSelected = assignments.every((assignment) =>
        newSelected.has(assignment.assignmentId.toString())
      )
      if (allIndividualSelected) {
        newSelected.clear()
        newSelected.add("all")
      }
    }

    setSelectedAssignments(newSelected)
  }

  // Filter links based on selected assignments
  const filteredLinks = useMemo(() => {
    if (selectedAssignments.has("all")) {
      return links
    }
    return links.filter((link) =>
      selectedAssignments.has(link.assignmentId.toString())
    )
  }, [links, selectedAssignments])

  // Calculate interaction counts for each user based on filtered links
  const userInteractionCounts = useMemo(() => {
    const counts = new Map()
    users.forEach((user) => counts.set(user.id, 0))

    filteredLinks.forEach((link) => {
      counts.set(link.user1, (counts.get(link.user1) || 0) + 1)
      counts.set(link.user2, (counts.get(link.user2) || 0) + 1)
    })

    return counts
  }, [users, filteredLinks])

  // Memoized computation of users not in interactions
  const usersNotInInteractions = useMemo(() => {
    // Get all user IDs that appear in filtered interactions
    const userIdsInInteractions = new Set()
    filteredLinks.forEach((link) => {
      userIdsInInteractions.add(link.user1)
      userIdsInInteractions.add(link.user2)
    })

    // Find users that are not in any interactions
    return users.filter((user) => !userIdsInInteractions.has(user.id))
  }, [users, filteredLinks])

  // Calculate dynamic dimensions based on data size
  const numUsers = users.length
  const numLinks = filteredLinks.length

  // Base dimensions that scale with data size
  const baseWidth = 700
  const baseHeight = 500

  // Scale factors based on data size
  const userScaleFactor = Math.min(Math.max(numUsers / 50, 0.8), 2.0) // Scale between 0.8x and 2x

  // Calculate final dimensions
  const width = Math.round(baseWidth * userScaleFactor)
  const height = Math.round(baseHeight * userScaleFactor)

  // Handle clicking outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest(".dropdown-container")) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isDropdownOpen])

  useEffect(() => {
    const simLinks = filteredLinks.map((d) => ({
      ...d,
      // Convert user1/user2 to source/target for D3 compatibility
      source: d.user1,
      target: d.user2,
    }))
    const simUsers = users.map((d) => ({ ...d }))
    const numNodes = simUsers.length

    // Logarithmic scaling for smoother adjustment
    const CLUMP_STRENGTH = -30 * Math.log(numNodes + 1) // stronger repulsion with more nodes, default (-0.3)
    const CENTER_STRENGTH = 0.1 //Default (0.1)

    const simulation = d3
      .forceSimulation(simUsers)
      .force(
        "link",
        d3.forceLink(simLinks).id((d) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(CLUMP_STRENGTH))
      .force("x", d3.forceX().strength(CENTER_STRENGTH))
      .force("y", d3.forceY().strength(CENTER_STRENGTH))

    const svg = d3
      .create("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [-width / 2, -height / 2, width, height])
      .attr("style", "max-width: 100%; height: auto;")

    const link = svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(simLinks)
      .join("line")
      .attr("stroke-width", 2) // Fixed width since value is now a string

    // Tooltip div (append to body for reliable overlay)
    let tooltip = d3.select("body").selectAll(".d3-tooltip").data([null])
    tooltip = tooltip
      .enter()
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
      .style("display", "none")

    const node = svg
      .append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(simUsers)
      .join("circle")
      .attr(
        "r",
        (d) =>
          BASE_NODE_RADIUS +
          (userInteractionCounts.get(d.id) || 0) * INTERACTION_SCALE_FACTOR
      ) // Scale node size by interaction count
      .attr("fill", (d) =>
        usersNotInInteractions.some((u) => u.id === d.id)
          ? ISOLATED_COLOUR
          : NODE_COLOUR
      )
      .on("mouseover", function (event, d) {
        tooltip
          .style("display", "block")
          .html(
            `<strong>ID:</strong> ${d.id}<br/><strong>Name:</strong> ${
              d.name
            }<br/><strong>Group:</strong> ${
              d.group
            }<br/><strong>Interactions:</strong> ${
              userInteractionCounts.get(d.id) || 0
            }`
          )
      })
      .on("mousemove", function (event) {
        // Use pageX/pageY for absolute positioning
        tooltip
          .style("left", event.pageX + 16 + "px")
          .style("top", event.pageY - 24 + "px")
      })
      .on("mouseout", function () {
        tooltip.style("display", "none")
      })

    node.call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    )

    // Add link tooltips
    link
      .on("mouseover", function (event, d) {
        const assignmentTitle =
          assignmentMap.get(d.assignmentId) || `Assignment ${d.assignmentId}`
        tooltip
          .style("display", "block")
          .html(
            `<strong>Users:</strong> ${d.user1} ↔ ${d.user2}<br/><strong>Assignment:</strong> ${assignmentTitle}<br/><strong>Content:</strong> ${d.value}`
          )
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", event.pageX + 16 + "px")
          .style("top", event.pageY - 24 + "px")
      })
      .on("mouseout", function () {
        tooltip.style("display", "none")
      })

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y)
    })

    function dragstarted(event) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    // Clear previous SVG if any
    if (containerRef.current) {
      containerRef.current.innerHTML = ""
      containerRef.current.appendChild(svg.node())
    }

    // Cleanup on unmount
    return () => {
      simulation.stop()
      if (tooltip) tooltip.remove()
    }
  }, [users, filteredLinks, assignments, userInteractionCounts, width, height])

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Title at the top */}
      <h1
        style={{
          margin: "20px 0 10px 0",
          color: "#333",
          fontSize: "28px",
          fontWeight: "bold",
          textAlign: "center",
        }}
      >
        Network Interaction Visualization
      </h1>

      {/* Main content area with side panel and visualization */}
      <div
        style={{
          display: "flex",
          flex: 1,
          gap: "0px",
          padding: "0 7.5vw 20px 7.5vw",
          alignItems: "center",
        }}
      >
        {/* Side Panel */}
        <div
          style={{
            width: "20%",
            backgroundColor: "#EAEAEA",
            padding: "20px",
            borderRadius: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            height: "fit-content",
            maxHeight: `${height}px`,
            overflowY: "auto",
          }}
        >
          {/* Assignment Filter Dropdown */}
          <div>
            <label
              style={{
                fontSize: "16px",
                fontWeight: "500",
                color: "#333",
                marginBottom: "10px",
                display: "block",
              }}
            >
              Filter by Assignment:
            </label>

            {/* Dropdown Container */}
            <div
              className="dropdown-container"
              style={{
                position: "relative",
                display: "inline-block",
                width: "100%",
              }}
            >
              {/* Dropdown Button */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                style={{
                  padding: "10px 15px",
                  fontSize: "14px",
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <span>
                  {selectedAssignments.has("all")
                    ? `All Assignments (${links.length})`
                    : `${selectedAssignments.size} Assignment${
                        selectedAssignments.size !== 1 ? "s" : ""
                      } Selected`}
                </span>
                <span
                  style={{
                    transform: isDropdownOpen
                      ? "rotate(180deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  ▼
                </span>
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: "0",
                    right: "0",
                    backgroundColor: "#fff",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    zIndex: 1000,
                    maxHeight: "300px",
                    overflowY: "auto",
                  }}
                >
                  {/* Select All Option */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      padding: "10px 15px",
                      borderBottom: "1px solid #eee",
                      backgroundColor: selectedAssignments.has("all")
                        ? "#f0f8ff"
                        : "#fff",
                      fontWeight: selectedAssignments.has("all")
                        ? "bold"
                        : "normal",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAssignments.has("all")}
                      onChange={() => handleAssignmentChange("all")}
                      style={{ margin: 0 }}
                    />
                    All Assignments ({links.length} interactions)
                  </label>

                  {/* Individual Assignment Options */}
                  {assignments.map((assignment) => {
                    const assignmentInteractionCount = links.filter(
                      (link) => link.assignmentId === assignment.assignmentId
                    ).length
                    const isSelected = selectedAssignments.has(
                      assignment.assignmentId.toString()
                    )

                    return (
                      <label
                        key={assignment.assignmentId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          padding: "10px 15px",
                          borderBottom:
                            assignment.assignmentId === assignments.length
                              ? "none"
                              : "1px solid #eee",
                          backgroundColor: isSelected ? "#f0f8ff" : "#fff",
                          fontWeight: isSelected ? "bold" : "normal",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            handleAssignmentChange(assignment.assignmentId)
                          }
                          style={{ margin: 0 }}
                        />
                        {assignment.title} ({assignmentInteractionCount}{" "}
                        interactions)
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Users without interactions */}
          {usersNotInInteractions.length > 0 && (
            <div>
              <h3
                style={{
                  margin: "0 0 10px 0",
                  color: "#333",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
              >
                Users Without Interactions ({usersNotInInteractions.length})
              </h3>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "5px",
                  maxHeight: "200px",
                  overflowY: "auto",
                }}
              >
                {usersNotInInteractions.map((user) => (
                  <span
                    key={user.id}
                    style={{
                      padding: "6px 10px",
                      backgroundColor: "#fff",
                      borderRadius: "4px",
                      fontSize: "12px",
                      color: "#555",
                      border: "1px solid #ddd",
                    }}
                  >
                    {user.name} (ID: {user.id})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visualization Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <div ref={containerRef} style={{ position: "relative" }} />
        </div>
      </div>
    </div>
  )
}
