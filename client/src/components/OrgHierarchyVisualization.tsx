import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
// @ts-ignore - animejs has module resolution issues
import anime from "animejs";
import { Card } from "@/components/ui/card";

interface Organization {
  id: number;
  name: string;
  description: string | null;
  parentId: number | null;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
}

interface HierarchyNode extends d3.HierarchyNode<Organization> {
  x?: number;
  y?: number;
}

interface Props {
  organizations: Organization[];
  onNodeClick?: (org: Organization) => void;
}

/**
 * Tensor-based org hierarchy visualization
 * Uses D3.js for hierarchical graph layout and Anime.js for animations
 * Represents parent-child relationships as fiber bundles where child entities are fibers of parent bundles
 */
export default function OrgHierarchyVisualization({ organizations, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);

  useEffect(() => {
    if (!svgRef.current || organizations.length === 0) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll("*").remove();

    const width = 1200;
    const height = 800;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("max-width", "100%")
      .style("height", "auto");

    // Create hierarchy from flat organization list
    const orgMap = new Map(organizations.map(org => [org.id, org]));
    const roots: Organization[] = [];
    const childrenMap = new Map<number, Organization[]>();

    // Build parent-child relationships
    organizations.forEach(org => {
      if (org.parentId === null) {
        roots.push(org);
      } else {
        if (!childrenMap.has(org.parentId)) {
          childrenMap.set(org.parentId, []);
        }
        childrenMap.get(org.parentId)!.push(org);
      }
    });

    // Convert to d3 hierarchy format
    function buildHierarchy(org: Organization): d3.HierarchyNode<Organization> {
      const children = childrenMap.get(org.id) || [];
      return d3.hierarchy({
        ...org,
        children: children.map(buildHierarchy)
      } as any);
    }

    // Handle multiple roots by creating a virtual root
    let root: d3.HierarchyNode<Organization>;
    if (roots.length === 0) {
      // No organizations yet
      return;
    } else if (roots.length === 1) {
      root = buildHierarchy(roots[0]);
    } else {
      // Multiple roots - create virtual root
      const virtualRoot = {
        id: -1,
        name: "All Organizations",
        description: null,
        parentId: null,
        ownerId: -1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      root = d3.hierarchy({
        ...virtualRoot,
        children: roots.map(buildHierarchy)
      } as any);
    }

    // Create tree layout
    const treeLayout = d3.tree<Organization>()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

    const treeData = treeLayout(root);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create fiber bundle links (tensor representation)
    const links = treeData.links();
    
    // Draw fiber bundles as curved paths with gradient
    const defs = svg.append("defs");
    
    links.forEach((link, i) => {
      const gradient = defs.append("linearGradient")
        .attr("id", `fiber-gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", link.source.x)
        .attr("y1", link.source.y)
        .attr("x2", link.target.x)
        .attr("y2", link.target.y);

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#3b82f6")
        .attr("stop-opacity", 0.8);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#8b5cf6")
        .attr("stop-opacity", 0.6);
    });

    const linkGroup = g.append("g")
      .attr("fill", "none")
      .attr("stroke-width", 2);

    const linkPaths = linkGroup.selectAll("path")
      .data(links)
      .join("path")
      .attr("d", d => {
        // Create curved fiber bundle path
        const sourceX = d.source.x!;
        const sourceY = d.source.y!;
        const targetX = d.target.x!;
        const targetY = d.target.y!;
        
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const dr = Math.sqrt(dx * dx + dy * dy);
        
        // Bezier curve for fiber representation
        return `M${sourceX},${sourceY} C${sourceX},${sourceY + dy / 2} ${targetX},${targetY - dy / 2} ${targetX},${targetY}`;
      })
      .attr("stroke", (d, i) => `url(#fiber-gradient-${i})`)
      .attr("stroke-dasharray", function() {
        const length = (this as SVGPathElement).getTotalLength();
        return `${length} ${length}`;
      })
      .attr("stroke-dashoffset", function() {
        return (this as SVGPathElement).getTotalLength();
      });

    // Animate fiber bundles
    linkPaths.each(function() {
      const path = this as SVGPathElement;
      const length = path.getTotalLength();
      
      // Simple CSS animation fallback since anime.js has import issues
      const pathElement = path;
      pathElement.style.transition = 'stroke-dashoffset 1.5s ease-in-out';
      pathElement.style.strokeDashoffset = '0';
    });

    // Create nodes
    const nodeGroup = g.append("g");

    const nodes = nodeGroup.selectAll("g")
      .data(treeData.descendants())
      .join("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        if (d.data.id !== -1) {
          setSelectedNode(d.data.id);
          onNodeClick?.(d.data);
        }
      });

    // Node circles with tensor bundle representation
    nodes.append("circle")
      .attr("r", d => {
        const childCount = (childrenMap.get(d.data.id) || []).length;
        // Size represents bundle density (number of child fibers)
        return 8 + Math.sqrt(childCount) * 4;
      })
      .attr("fill", d => d.data.id === selectedNode ? "#8b5cf6" : "#3b82f6")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .style("opacity", 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .style("opacity", 1);

    // Node labels
    nodes.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d.children ? -12 : 12)
      .attr("text-anchor", d => d.children ? "end" : "start")
      .text(d => d.data.name)
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", "#1f2937")
      .style("opacity", 0)
      .transition()
      .duration(800)
      .delay((d, i) => i * 50 + 200)
      .style("opacity", 1);

    // Add fiber count badges for parent nodes
    nodes.filter(d => (childrenMap.get(d.data.id) || []).length > 0)
      .append("circle")
      .attr("r", 10)
      .attr("cx", 15)
      .attr("cy", -15)
      .attr("fill", "#ef4444")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    nodes.filter(d => (childrenMap.get(d.data.id) || []).length > 0)
      .append("text")
      .attr("x", 15)
      .attr("y", -15)
      .attr("dy", "0.31em")
      .attr("text-anchor", "middle")
      .text(d => (childrenMap.get(d.data.id) || []).length)
      .style("font-size", "10px")
      .style("font-weight", "bold")
      .style("fill", "#fff");

  }, [organizations, selectedNode, onNodeClick]);

  if (organizations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No organizations to visualize. Create your first organization to see the hierarchy.</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Organization Hierarchy</h3>
        <p className="text-sm text-muted-foreground">
          Tensor-based visualization where child entities are represented as fibers of their parent organization bundles
        </p>
      </div>
      <div className="overflow-auto">
        <svg ref={svgRef} className="w-full" />
      </div>
    </Card>
  );
}
