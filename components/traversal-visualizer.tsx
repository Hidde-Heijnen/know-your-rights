"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import type { TraversalDecision, LegalNode } from "@/lib/types/traversal";

interface TraversalVisualizerProps {
  traversalPath: TraversalDecision[];
  relevantNodes: LegalNode[];
  finalRecommendation?: string;
}

export function TraversalVisualizer({
  traversalPath,
  relevantNodes,
  finalRecommendation
}: TraversalVisualizerProps) {
  // Group decisions by depth for visualization
  const decisionsByDepth = traversalPath.reduce((acc, decision) => {
    if (!acc[decision.depth]) acc[decision.depth] = [];
    acc[decision.depth].push(decision);
    return acc;
  }, {} as Record<number, TraversalDecision[]>);

  const getRelevanceColor = (score: number) => {
    if (score >= 0.8) return "bg-green-100 text-green-800";
    if (score >= 0.5) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Traversal Path Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Document Traversal Path</CardTitle>
          <CardDescription>
            Breadth-first search through legal documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {Object.entries(decisionsByDepth).map(([depth, decisions]) => (
                <div key={depth} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge>Level {depth}</Badge>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                  
                  <div className="space-y-2 pl-4">
                    {decisions.map((decision, idx) => (
                      <div
                        key={`${decision.nodeId}-${idx}`}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          decision.visited ? "bg-muted/50" : "opacity-60"
                        }`}
                      >
                        {decision.visited ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                        )}
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">
                              Node: {decision.nodeId}
                            </span>
                            <Badge
                              className={getRelevanceColor(decision.relevanceScore)}
                            >
                              Score: {decision.relevanceScore.toFixed(2)}
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-muted-foreground">
                            {decision.reasoning}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Relevant Nodes */}
      <Card>
        <CardHeader>
          <CardTitle>Relevant Legal Sections</CardTitle>
          <CardDescription>
            {relevantNodes.length} sections identified as relevant to your case
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {relevantNodes.map((node, index) => (
              <AccordionItem key={node.id} value={`item-${index}`}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2 text-left">
                    <ChevronRight className="h-4 w-4" />
                    <span>{node.title}</span>
                    {node.metadata?.keywords && (
                      <div className="flex gap-1 ml-auto">
                        {node.metadata.keywords.slice(0, 3).map((keyword, idx) => (
                          <Badge key={idx} className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    <p className="text-sm">{node.content}</p>
                    
                    {node.metadata?.legal_references && (
                      <div className="pt-2 border-t">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Legal References:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {node.metadata.legal_references.map((ref, idx) => (
                            <Badge key={idx} className="text-xs">
                              {ref}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Final Recommendation */}
      {finalRecommendation && (
        <Card>
          <CardHeader>
            <CardTitle>Legal Recommendation</CardTitle>
            <CardDescription>
              Based on the analysis of relevant legal documentation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p>{finalRecommendation}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 