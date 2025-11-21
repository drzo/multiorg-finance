/**
 * Universal Hypergraph Visualization
 * 
 * Displays the complete system as a hypergraph with:
 * - Multi-parent shareholding (complex ownership)
 * - Multiplex relationships (multiple edge types)
 * - N-ary hyperedges (connecting multiple nodes)
 * - Event timelines (state transitions)
 * - System dynamics (stocks & flows)
 */

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HypergraphNode {
  id: number;
  nodeType: string;
  label: string;
  properties?: any;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface HypergraphHyperedge {
  id: number;
  edgeType: string;
  label?: string;
  weight?: number;
  nodeIds: number[]; // Nodes connected by this hyperedge
  roles?: string[]; // Role of each node in the hyperedge
}

interface Shareholding {
  childId: number;
  parentId: number;
  sharePercentage: number;
  votingRights?: number;
}

interface Relationship {
  id: number;
  relationshipType: string;
  category: string;
  sourceId: number;
  targetId: number;
  weight?: number;
}

interface Props {
  nodes: HypergraphNode[];
  hyperedges: HypergraphHyperedge[];
  shareholdings?: Shareholding[];
  relationships?: Relationship[];
  onNodeClick?: (node: HypergraphNode) => void;
  onHyperedgeClick?: (hyperedge: HypergraphHyperedge) => void;
}

export default function UniversalHypergraphVisualization({
  nodes,
  hyperedges,
  shareholdings = [],
  relationships = [],
  onNodeClick,
  onHyperedgeClick,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const [selectedHyperedge, setSelectedHyperedge] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"hypergraph" | "ownership" | "multiplex" | "all">("all");
  const [colorScheme, setColorScheme] = useState<"type" | "weight" | "degree">("type");

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous content
    svg.selectAll("*").remove();

    // Create main group with zoom behavior
    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    // Prepare data based on view mode
    let visibleNodes = [...nodes];
    let visibleHyperedges = [...hyperedges];
    let visibleShareholdings = [...shareholdings];
    let visibleRelationships = [...relationships];

    if (viewMode === "ownership") {
      visibleHyperedges = [];
      visibleRelationships = [];
    } else if (viewMode === "multiplex") {
      visibleShareholdings = [];
      visibleHyperedges = [];
    } else if (viewMode === "hypergraph") {
      visibleShareholdings = [];
      visibleRelationships = [];
    }

    // Create force simulation
    const simulation = d3.forceSimulation(visibleNodes as any)
      .force("link", d3.forceLink([]).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40));

    // Color scales
    const nodeTypeColor = d3.scaleOrdinal(d3.schemeCategory10);
    const edgeTypeColor = d3.scaleOrdinal(d3.schemeSet3);
    const weightColor = d3.scaleSequential(d3.interpolateBlues).domain([0, 10000]);

    // Draw shareholding links (ownership)
    const shareholdingLinks = g.append("g")
      .selectAll("line")
      .data(visibleShareholdings)
      .join("line")
      .attr("stroke", "#ff6b6b")
      .attr("stroke-width", (d) => 1 + (d.sharePercentage / 1000))
      .attr("stroke-opacity", 0.6)
      .attr("stroke-dasharray", "5,5")
      .style("pointer-events", "none");

    // Draw relationship links (multiplex)
    const relationshipLinks = g.append("g")
      .selectAll("line")
      .data(visibleRelationships)
      .join("line")
      .attr("stroke", (d) => edgeTypeColor(d.category))
      .attr("stroke-width", (d) => d.weight ? 1 + (d.weight / 2000) : 2)
      .attr("stroke-opacity", 0.5)
      .style("pointer-events", "none");

    // Draw hyperedges as convex hulls
    const hyperedgeGroups = g.append("g")
      .selectAll("path")
      .data(visibleHyperedges)
      .join("path")
      .attr("fill", (d) => edgeTypeColor(d.edgeType))
      .attr("fill-opacity", 0.1)
      .attr("stroke", (d) => edgeTypeColor(d.edgeType))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.4)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedHyperedge(d.id);
        onHyperedgeClick?.(d);
      });

    // Draw nodes
    const nodeGroup = g.append("g");

    const nodeCircles = nodeGroup.selectAll("circle")
      .data(visibleNodes)
      .join("circle")
      .attr("r", 20)
      .attr("fill", (d) => {
        if (colorScheme === "type") {
          return nodeTypeColor(d.nodeType);
        } else if (colorScheme === "weight") {
          return weightColor(d.properties?.weight || 0);
        } else {
          // Degree-based coloring
          const degree = visibleHyperedges.filter(he => he.nodeIds.includes(d.id)).length;
          return d3.interpolateViridis(degree / 10);
        }
      })
      .attr("stroke", (d) => selectedNode === d.id ? "#000" : "#fff")
      .attr("stroke-width", (d) => selectedNode === d.id ? 3 : 2)
      .style("cursor", "pointer")
      .call(d3.drag<SVGCircleElement, HypergraphNode>()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any
      )
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.id);
        onNodeClick?.(d);
      });

    // Node labels
    const nodeLabels = nodeGroup.selectAll("text")
      .data(visibleNodes)
      .join("text")
      .text((d) => d.label)
      .attr("font-size", 10)
      .attr("text-anchor", "middle")
      .attr("dy", 35)
      .attr("fill", "#333")
      .style("pointer-events", "none");

    // Node type badges
    const nodeBadges = nodeGroup.selectAll("text.badge")
      .data(visibleNodes)
      .join("text")
      .attr("class", "badge")
      .text((d) => d.nodeType.substring(0, 3).toUpperCase())
      .attr("font-size", 8)
      .attr("text-anchor", "middle")
      .attr("dy", 4)
      .attr("fill", "#fff")
      .style("pointer-events", "none");

    // Update positions on simulation tick
    simulation.on("tick", () => {
      // Update shareholding links
      shareholdingLinks
        .attr("x1", (d: any) => {
          const parent = visibleNodes.find(n => n.id === d.parentId);
          return parent?.x || 0;
        })
        .attr("y1", (d: any) => {
          const parent = visibleNodes.find(n => n.id === d.parentId);
          return parent?.y || 0;
        })
        .attr("x2", (d: any) => {
          const child = visibleNodes.find(n => n.id === d.childId);
          return child?.x || 0;
        })
        .attr("y2", (d: any) => {
          const child = visibleNodes.find(n => n.id === d.childId);
          return child?.y || 0;
        });

      // Update relationship links
      relationshipLinks
        .attr("x1", (d: any) => {
          const source = visibleNodes.find(n => n.id === d.sourceId);
          return source?.x || 0;
        })
        .attr("y1", (d: any) => {
          const source = visibleNodes.find(n => n.id === d.sourceId);
          return source?.y || 0;
        })
        .attr("x2", (d: any) => {
          const target = visibleNodes.find(n => n.id === d.targetId);
          return target?.x || 0;
        })
        .attr("y2", (d: any) => {
          const target = visibleNodes.find(n => n.id === d.targetId);
          return target?.y || 0;
        });

      // Update hyperedge convex hulls
      hyperedgeGroups.attr("d", (d) => {
        const points = d.nodeIds
          .map(nodeId => visibleNodes.find(n => n.id === nodeId))
          .filter(n => n && n.x !== undefined && n.y !== undefined)
          .map(n => [n!.x!, n!.y!] as [number, number]);

        if (points.length < 3) return null;

        // Calculate convex hull
        const hull = d3.polygonHull(points);
        if (!hull) return null;

        // Expand hull slightly for better visibility
        const centroid = d3.polygonCentroid(hull);
        const expanded = hull.map(([x, y]) => {
          const dx = x - centroid[0];
          const dy = y - centroid[1];
          const scale = 1.3;
          return [centroid[0] + dx * scale, centroid[1] + dy * scale];
        });

        return "M" + expanded.join("L") + "Z";
      });

      // Update node positions
      nodeCircles
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      nodeLabels
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);

      nodeBadges
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    return () => {
      simulation.stop();
    };
  }, [nodes, hyperedges, shareholdings, relationships, selectedNode, selectedHyperedge, viewMode, colorScheme]);

  return (
    <Card className="p-4">
      <div className="mb-4 flex gap-4 items-center flex-wrap">
        <div>
          <label className="text-sm font-medium mr-2">View Mode:</label>
          <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Layers</SelectItem>
              <SelectItem value="hypergraph">Hypergraph Only</SelectItem>
              <SelectItem value="ownership">Ownership Network</SelectItem>
              <SelectItem value="multiplex">Multiplex Network</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mr-2">Color By:</label>
          <Select value={colorScheme} onValueChange={(value: any) => setColorScheme(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="type">Node Type</SelectItem>
              <SelectItem value="weight">Weight</SelectItem>
              <SelectItem value="degree">Degree</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Badge variant="outline">Nodes: {nodes.length}</Badge>
          <Badge variant="outline">Hyperedges: {hyperedges.length}</Badge>
          <Badge variant="outline">Shareholdings: {shareholdings.length}</Badge>
          <Badge variant="outline">Relationships: {relationships.length}</Badge>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedNode(null);
            setSelectedHyperedge(null);
          }}
        >
          Clear Selection
        </Button>
      </div>

      <div className="relative bg-gray-50 rounded-lg border">
        <svg
          ref={svgRef}
          className="w-full"
          style={{ height: "600px" }}
        />

        {selectedNode && (
          <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs">
            <h3 className="font-semibold mb-2">Selected Node</h3>
            <p className="text-sm"><strong>ID:</strong> {selectedNode}</p>
            <p className="text-sm"><strong>Type:</strong> {nodes.find(n => n.id === selectedNode)?.nodeType}</p>
            <p className="text-sm"><strong>Label:</strong> {nodes.find(n => n.id === selectedNode)?.label}</p>
          </div>
        )}

        {selectedHyperedge && (
          <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs">
            <h3 className="font-semibold mb-2">Selected Hyperedge</h3>
            <p className="text-sm"><strong>ID:</strong> {selectedHyperedge}</p>
            <p className="text-sm"><strong>Type:</strong> {hyperedges.find(he => he.id === selectedHyperedge)?.edgeType}</p>
            <p className="text-sm"><strong>Nodes:</strong> {hyperedges.find(he => he.id === selectedHyperedge)?.nodeIds.length}</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Legend:</strong></p>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-red-500">Dashed lines</span> = Shareholding (ownership)</li>
          <li><span className="text-blue-500">Solid lines</span> = Typed relationships (multiplex)</li>
          <li><span className="text-green-500">Shaded regions</span> = Hyperedges (n-ary relationships)</li>
          <li>Drag nodes to reposition, scroll to zoom, click to select</li>
        </ul>
      </div>
    </Card>
  );
}
