"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, Circle, ArrowDown, ArrowRight, TreePine } from "lucide-react";
import type { TraversalDecision, LegalNode } from "@/lib/types/traversal";

interface TreeNode {
  id: string;
  title: string;
  decision: TraversalDecision;
  children: TreeNode[];
  level: number;
  isRelevant: boolean;
  parent?: string;
}

interface TraversalTreeVisualizerProps {
  traversalPath: TraversalDecision[];
  relevantNodes: LegalNode[];
  documentNodes: Record<string, LegalNode>;
}

export function TraversalTreeVisualizer({
  traversalPath,
  relevantNodes,
  documentNodes
}: TraversalTreeVisualizerProps) {
  
  // Build tree structure from traversal decisions
  const treeStructure = useMemo(() => {
    const nodeMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];
    
    // Sort decisions by depth to process parents before children
    const sortedDecisions = [...traversalPath].sort((a, b) => a.depth - b.depth);
    
    // Create tree nodes
    sortedDecisions.forEach(decision => {
      const node = documentNodes[decision.nodeId];
      if (!node) return;
      
      const treeNode: TreeNode = {
        id: decision.nodeId,
        title: node.title,
        decision,
        children: [],
        level: decision.depth,
        isRelevant: relevantNodes.some(rn => rn.id === decision.nodeId),
        parent: undefined
      };
      
      nodeMap.set(decision.nodeId, treeNode);
      
      // Determine parent based on document structure
      let parentFound = false;
      for (const [parentId, parentNode] of Object.entries(documentNodes)) {
        if (parentNode.children?.includes(decision.nodeId)) {
          const parentTreeNode = nodeMap.get(parentId);
          if (parentTreeNode) {
            parentTreeNode.children.push(treeNode);
            treeNode.parent = parentId;
            parentFound = true;
            break;
          }
        }
      }
      
      // If no parent found, it's a root node
      if (!parentFound && decision.depth === 0) {
        rootNodes.push(treeNode);
      }
    });
    
    return { rootNodes, nodeMap };
  }, [traversalPath, relevantNodes, documentNodes]);

  const getRelevanceColor = (score: number, visited: boolean) => {
    if (!visited) return "text-gray-400 border-gray-200";
    if (score >= 0.8) return "text-green-700 border-green-300 bg-green-50";
    if (score >= 0.5) return "text-yellow-700 border-yellow-300 bg-yellow-50";
    return "text-red-700 border-red-300 bg-red-50";
  };

  const getConnectionColor = (node: TreeNode) => {
    if (!node.decision.visited) return "border-gray-300";
    if (node.isRelevant) return "border-green-500";
    if (node.decision.relevanceScore >= 0.5) return "border-yellow-500";
    return "border-red-400";
  };

  const renderTreeNode = (node: TreeNode, isLast: boolean = false, prefix: string = "") => {
    const hasChildren = node.children.length > 0;
    const nextPrefix = prefix + (isLast ? "    " : "│   ");
    
    return (
      <div key={node.id} className="relative">
        {/* Node representation */}
        <div className="flex items-center gap-2 py-1">
          {/* Tree connector */}
          <span className="text-gray-400 font-mono text-sm select-none">
            {prefix}{isLast ? "└── " : "├── "}
          </span>
          
          {/* Node icon */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className={`w-3 h-3 rounded-full border-2 ${getRelevanceColor(node.decision.relevanceScore, node.decision.visited)}`}>
                  {node.decision.visited ? (
                    node.isRelevant ? (
                      <CheckCircle2 className="w-full h-full text-green-600" />
                    ) : (
                      <Circle className="w-full h-full" />
                    )
                  ) : (
                    <XCircle className="w-full h-full text-gray-400" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs space-y-1">
                  <p><strong>Score:</strong> {node.decision.relevanceScore.toFixed(2)}</p>
                  <p><strong>Visited:</strong> {node.decision.visited ? "Yes" : "No"}</p>
                  <p><strong>Depth:</strong> {node.decision.depth}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {/* Node title and info */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`text-sm font-medium truncate ${
              node.decision.visited ? "text-gray-900" : "text-gray-500"
            }`}>
              {node.title || node.id}
            </span>
            
            <Badge className={`text-xs px-1.5 py-0.5 ${getRelevanceColor(node.decision.relevanceScore, node.decision.visited)}`}>
              {node.decision.relevanceScore.toFixed(2)}
            </Badge>
            
            {node.isRelevant && (
              <Badge className="text-xs px-1.5 py-0.5 bg-green-100 text-green-800">
                Relevant
              </Badge>
            )}
            
            {hasChildren && (
              <span className="text-xs text-gray-500">
                ({node.children.length} children)
              </span>
            )}
          </div>
        </div>
        
        {/* Reasoning tooltip */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="ml-8 text-xs text-gray-600 truncate cursor-help">
                {node.decision.reasoning}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-sm">
              <p className="text-xs">{node.decision.reasoning}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Render children */}
        {hasChildren && (
          <div className="ml-0">
            {node.children.map((child, index) => 
              renderTreeNode(child, index === node.children.length - 1, nextPrefix)
            )}
          </div>
        )}
      </div>
    );
  };

  // Statistics
  const stats = useMemo(() => {
    const totalNodes = traversalPath.length;
    const visitedNodes = traversalPath.filter(d => d.visited).length;
    const relevantCount = relevantNodes.length;
    const maxDepth = Math.max(...traversalPath.map(d => d.depth));
    const avgScore = traversalPath.reduce((sum, d) => sum + d.relevanceScore, 0) / totalNodes;
    
    return {
      totalNodes,
      visitedNodes,
      relevantCount,
      maxDepth,
      avgScore
    };
  }, [traversalPath, relevantNodes]);

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TreePine className="h-5 w-5" />
            Traversal Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{stats.totalNodes}</div>
              <div className="text-xs text-gray-600">Total Nodes</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">{stats.visitedNodes}</div>
              <div className="text-xs text-gray-600">Visited</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-amber-600">{stats.relevantCount}</div>
              <div className="text-xs text-gray-600">Relevant</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-600">{stats.maxDepth + 1}</div>
              <div className="text-xs text-gray-600">Max Depth</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-600">{stats.avgScore.toFixed(2)}</div>
              <div className="text-xs text-gray-600">Avg Score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tree Structure */}
      <Card>
        <CardHeader>
          <CardTitle>Document Traversal Tree</CardTitle>
          <CardDescription>
            Hierarchical view of the legal document navigation path
          </CardDescription>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>Relevant & Visited</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle className="w-3 h-3 text-gray-600" />
              <span>Visited</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-gray-400" />
              <span>Skipped</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="font-mono text-sm space-y-0">
              {treeStructure.rootNodes.length > 0 ? (
                treeStructure.rootNodes.map((rootNode, index) => 
                  renderTreeNode(rootNode, index === treeStructure.rootNodes.length - 1)
                )
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No tree structure available
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Depth Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Depth Analysis</CardTitle>
          <CardDescription>
            Distribution of nodes by traversal depth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: stats.maxDepth + 1 }, (_, depth) => {
              const nodesAtDepth = traversalPath.filter(d => d.depth === depth);
              const visitedAtDepth = nodesAtDepth.filter(d => d.visited);
              const relevantAtDepth = nodesAtDepth.filter(d => 
                relevantNodes.some(rn => rn.id === d.nodeId)
              );
              
              return (
                <div key={depth} className="flex items-center gap-3">
                  <Badge className="w-16 justify-center">
                    Level {depth}
                  </Badge>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 relative overflow-hidden">
                    <div 
                      className="bg-blue-300 h-full rounded-full" 
                      style={{ width: `${(nodesAtDepth.length / stats.totalNodes) * 100}%` }}
                    />
                    <div 
                      className="bg-green-500 h-full rounded-full absolute top-0 left-0" 
                      style={{ width: `${(relevantAtDepth.length / stats.totalNodes) * 100}%` }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 w-24 text-right">
                    {relevantAtDepth.length}/{nodesAtDepth.length} nodes
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 